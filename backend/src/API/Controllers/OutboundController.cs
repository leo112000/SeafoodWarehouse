using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

public class CreateOutboundSupplyDto
{
    public string Name { get; set; } = string.Empty;
    public string? PackagingCode { get; set; }
    public string Unit { get; set; } = "Cái";
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } = 0;
    public decimal TotalAmount { get; set; } = 0;
}

public class CreateOutboundRequestDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string Reason { get; set; } = "Bán hàng";
    public string Date { get; set; } = string.Empty;
    public decimal TotalWeightKg { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; } = 0;
    public string? DiscountReason { get; set; }
    public string CreatedBy { get; set; } = "Thủ kho";
    public List<CreateOutboundBatchDto> Batches { get; set; } = new();
    public List<CreateOutboundSupplyDto> Supplies { get; set; } = new();
}

public class CreateOutboundBatchDto
{
    public string BatchCode { get; set; } = string.Empty;
    public string Species { get; set; } = string.Empty;
    public decimal QuantityKg { get; set; }
    public decimal GrossWeight { get; set; }
    public decimal TareWeight { get; set; }
    public string? PackagingCode { get; set; }
    public int PackagingQty { get; set; }
    public string ExpiryDate { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>
/// API Quản lý Phiếu Xuất Kho - Xử lý trực tiếp CSDL
/// </summary>
[Route("api/[controller]")]
public class OutboundController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public OutboundController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách phiếu xuất kho từ CSDL với đầy đủ Cân thô, Bì/khay, Khối lượng thực, Vật phẩm kèm &amp; Giảm giá
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetAll(CancellationToken cancellationToken = default)
    {
        // 1. Tải danh sách Phiếu Xuất từ bảng OutboundReceipts (kèm vật phẩm bán kèm)
        var receipts = await _context.OutboundReceipts
            .Where(r => !r.IsDeleted)
            .Include(r => r.Supplies.Where(s => !s.IsDeleted))
            .OrderByDescending(r => r.TransactionDate)
            .ToListAsync(cancellationToken);

        // 2. Tải các giao dịch chi tiết lô hàng hải sản
        var transactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Export)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var txGrouped = transactions.GroupBy(t => t.ReferenceNumber).ToDictionary(g => g.Key, g => g.ToList());

        var result = receipts.Select(r =>
        {
            var batches = txGrouped.TryGetValue(r.ReferenceNumber, out var txList)
                ? txList.Select(b =>
                {
                    var price = b.UnitPrice > 0 ? b.UnitPrice : (b.LotBatch != null && b.LotBatch.UnitPrice > 0 ? b.LotBatch.UnitPrice : 250000m);
                    var amt = b.TotalAmount > 0 ? b.TotalAmount : (b.Quantity * price);
                    var tareW = (double)b.TareWeight;
                    var netW = (double)b.Quantity;
                    var grossW = b.GrossWeight > 0 ? (double)b.GrossWeight : (netW + tareW);

                    var storageType = b.LotBatch?.Product?.StorageType;
                    var conditionStr = storageType switch
                    {
                        "ALIVE" => "Tươi sống",
                        "FRESH" => "Ướp đá",
                        "DRY"   => "Khô",
                        _       => "Cấp đông"
                    };

                    return (object)new
                    {
                        batchCode = b.LotBatch?.BatchCode ?? "LOT-EXPORT",
                        species = b.LotBatch?.Product?.Name ?? "Hải sản",
                        quantityKg = netW,
                        netWeight = netW,
                        tareWeight = tareW,
                        grossWeight = grossW,
                        packagingCode = b.PackagingCode,
                        packagingQty = b.PackagingQty,
                        storageCondition = conditionStr,
                        expiryDate = b.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                        unitPrice = (double)price,
                        amount = (double)amt
                    };
                }).ToList()
                : new List<object>();

            var supplies = r.Supplies.Select(s => (object)new
            {
                name = s.Name,
                packagingCode = s.PackagingCode,
                unit = s.Unit,
                quantity = s.Quantity,
                unitPrice = (double)s.UnitPrice,
                totalAmount = (double)s.TotalAmount
            }).ToList();

            return new
            {
                id = r.ReferenceNumber,
                date = r.TransactionDate.ToString("yyyy-MM-dd HH:mm:ss"),
                customerName = r.CustomerName,
                reason = r.Reason,
                totalWeightKg = (double)r.TotalWeightKg,
                subTotal = (double)r.SubTotal,
                suppliesTotal = (double)r.SuppliesTotal,
                discountAmount = (double)r.DiscountAmount,
                discountReason = r.DiscountReason ?? "",
                totalAmount = (double)r.TotalAmount,
                createdBy = r.CreatedBy,
                supplies,
                batches
            };
        }).ToList();

        // Xử lý các phiếu cũ (nếu có) trước khi tạo bảng OutboundReceipts
        var receiptRefNos = receipts.Select(r => r.ReferenceNumber).ToHashSet();
        foreach (var kv in txGrouped)
        {
            if (!receiptRefNos.Contains(kv.Key))
            {
                var g = kv.Value;
                var first = g.First();
                var subTotal = (double)g.Sum(x => x.TotalAmount > 0 ? x.TotalAmount : (x.Quantity * (x.UnitPrice > 0 ? x.UnitPrice : 250000m)));

                result.Add(new
                {
                    id = kv.Key,
                    date = first.TransactionDate.ToString("yyyy-MM-dd HH:mm:ss"),
                    customerName = first.Note?.Split('-').FirstOrDefault()?.Replace("Khách hàng:", "").Trim() ?? "Khách hàng lẻ",
                    reason = first.Note?.Split('-').Skip(1).FirstOrDefault()?.Replace("Lý do:", "").Trim() ?? "Bán hàng",
                    totalWeightKg = (double)g.Sum(x => x.Quantity),
                    subTotal = subTotal,
                    suppliesTotal = 0.0,
                    discountAmount = 0.0,
                    discountReason = "",
                    totalAmount = subTotal,
                    createdBy = first.CreatedBy,
                    supplies = new List<object>(),
                    batches = g.Select(b =>
                    {
                        var price = b.UnitPrice > 0 ? b.UnitPrice : 250000m;
                        var amt = b.TotalAmount > 0 ? b.TotalAmount : (b.Quantity * price);
                        var tareW = (double)b.TareWeight;
                        var netW = (double)b.Quantity;
                        return (object)new
                        {
                            batchCode = b.LotBatch?.BatchCode ?? "LOT-EXPORT",
                            species = b.LotBatch?.Product?.Name ?? "Hải sản",
                            quantityKg = netW,
                            netWeight = netW,
                            tareWeight = tareW,
                            grossWeight = b.GrossWeight > 0 ? (double)b.GrossWeight : (netW + tareW),
                            packagingCode = b.PackagingCode,
                            packagingQty = b.PackagingQty,
                            storageCondition = "Cấp đông",
                            expiryDate = b.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                            unitPrice = (double)price,
                            amount = (double)amt
                        };
                    }).ToList()
                });
            }
        }

        return Ok(Result<object>.Success(result.OrderByDescending(x => x.date).ToList()));
    }

    /// <summary>
    /// Tạo mới phiếu xuất kho, sinh Mã phiếu duy nhất (PXK-yyyyMMddHHmmss-XX) để không bao giờ trùng hoặc đè phiếu xuất
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<object>>> Create([FromBody] CreateOutboundRequestDto request, CancellationToken cancellationToken = default)
    {
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => !w.IsDeleted, cancellationToken);
        if (warehouse == null)
        {
            warehouse = new Warehouse
            {
                Code = "KHO-MAIN",
                Name = "Kho Hải Sản Chính",
                Location = "Kho Tổng",
                IsActive = true
            };
            _context.Warehouses.Add(warehouse);
            await _context.SaveChangesAsync(cancellationToken);
        }

        DateTime nowUtc = DateTime.UtcNow;
        DateTime txDate = nowUtc;

        if (!string.IsNullOrWhiteSpace(request.Date) && DateTime.TryParse(request.Date, out var parsedDate))
        {
            txDate = DateTime.SpecifyKind(parsedDate.Date.Add(nowUtc.TimeOfDay), DateTimeKind.Utc);
        }

        // Sinh mã phiếu duy nhất PXK-yyyyMMddHHmmss-XX không bao giờ trùng lặp
        string refNo = $"PXK-{txDate.AddHours(7):yyyyMMddHHmmss}-{Random.Shared.Next(10, 99)}";

        // 1. Tính toán tài chính chuẩn
        decimal seafoodSubTotal = 0;
        decimal totalNetWeight = 0;

        foreach (var item in request.Batches)
        {
            var lotBatch = await _context.LotBatches
                        .Include(b => b.Product)
                        .FirstOrDefaultAsync(b => b.BatchCode == item.BatchCode && !b.IsDeleted, cancellationToken)
                        ?? await _context.LotBatches
                        .Include(b => b.Product)
                        .FirstOrDefaultAsync(b => b.Product.Code == item.Species && !b.IsDeleted, cancellationToken)
                        ?? await _context.LotBatches
                        .Include(b => b.Product)
                        .FirstOrDefaultAsync(b => !b.IsDeleted, cancellationToken);

            if (lotBatch != null)
            {
                // Trừ tồn kho lô hàng
                lotBatch.CurrentQuantity = Math.Max(0, lotBatch.CurrentQuantity - item.QuantityKg);

                // Trừ tồn kho tại vị trí
                var invItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.LotBatchId == lotBatch.Id && !i.IsDeleted, cancellationToken);
                if (invItem != null)
                {
                    invItem.Quantity = Math.Max(0, invItem.Quantity - item.QuantityKg);
                }

                // Ghi nhận giao dịch xuất kho CSDL với Giá bán, Thành tiền, Cân thô và Số cân bì
                var sellPrice = item.UnitPrice > 0 ? item.UnitPrice : (lotBatch.UnitPrice > 0 ? lotBatch.UnitPrice : (lotBatch.Product?.ReferencePrice > 0 ? lotBatch.Product.ReferencePrice : 250000m));
                var totalSellAmt = item.Amount > 0 ? item.Amount : (item.QuantityKg * sellPrice);
                var grossW = item.GrossWeight > 0 ? item.GrossWeight : (item.QuantityKg + item.TareWeight);

                seafoodSubTotal += totalSellAmt;
                totalNetWeight += item.QuantityKg;

                var tx = new InventoryTransaction
                {
                    ReferenceNumber = refNo,
                    Type = TransactionType.Export,
                    LotBatchId = lotBatch.Id,
                    SourceWarehouseId = warehouse.Id,
                    Quantity = item.QuantityKg,
                    TareWeight = item.TareWeight,
                    GrossWeight = grossW,
                    PackagingCode = item.PackagingCode,
                    PackagingQty = item.PackagingQty,
                    UnitPrice = sellPrice,
                    TotalAmount = totalSellAmt,
                    TransactionDate = txDate,
                    CreatedBy = request.CreatedBy ?? "Thủ kho",
                    Note = $"Khách hàng: {request.CustomerName} - Lý do: {request.Reason}"
                };
                _context.InventoryTransactions.Add(tx);
            }
        }

        // 2. Tạo bản ghi Phiếu Xuất Kho (OutboundReceipt) chính thức trong CSDL
        decimal suppliesTotal = request.Supplies.Sum(s => s.TotalAmount > 0 ? s.TotalAmount : (s.Quantity * s.UnitPrice));
        decimal finalTotal = Math.Max(0, seafoodSubTotal + suppliesTotal - request.DiscountAmount);

        var receipt = new OutboundReceipt
        {
            ReferenceNumber = refNo,
            CustomerName = request.CustomerName,
            Reason = request.Reason,
            TransactionDate = txDate,
            CreatedBy = request.CreatedBy ?? "Thủ kho",
            TotalWeightKg = totalNetWeight,
            SubTotal = seafoodSubTotal,
            SuppliesTotal = suppliesTotal,
            DiscountAmount = request.DiscountAmount,
            DiscountReason = request.DiscountReason,
            TotalAmount = finalTotal,
            Note = $"Lý do: {request.Reason}"
        };

        // 3. Thêm các vật phẩm kèm vào bảng OutboundSupplies
        foreach (var sup in request.Supplies)
        {
            var supplyItem = new OutboundSupply
            {
                Name = sup.Name,
                PackagingCode = sup.PackagingCode,
                Unit = string.IsNullOrWhiteSpace(sup.Unit) ? "Cái" : sup.Unit,
                Quantity = sup.Quantity > 0 ? sup.Quantity : 1,
                UnitPrice = sup.UnitPrice,
                TotalAmount = sup.TotalAmount > 0 ? sup.TotalAmount : (sup.Quantity * sup.UnitPrice)
            };
            receipt.Supplies.Add(supplyItem);
        }

        _context.OutboundReceipts.Add(receipt);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<object>.Success(new { referenceNumber = refNo }));
    }
}
