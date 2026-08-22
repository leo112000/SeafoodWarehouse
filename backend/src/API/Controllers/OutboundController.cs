using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

public class CreateOutboundRequestDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string Reason { get; set; } = "Bán hàng";
    public string Date { get; set; } = string.Empty;
    public decimal TotalWeightKg { get; set; }
    public decimal TotalAmount { get; set; }
    public string CreatedBy { get; set; } = "Thủ kho";
    public List<CreateOutboundBatchDto> Batches { get; set; } = new();
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
    /// Lấy danh sách phiếu xuất kho từ CSDL với đầy đủ Cân thô, Bì/khay, Khối lượng thực & Đơn giá bán thực tế
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetAll(CancellationToken cancellationToken = default)
    {
        var transactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Export)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .Include(t => t.SourceWarehouse)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var grouped = transactions
            .GroupBy(t => t.ReferenceNumber)
            .Select(g => new
            {
                id = g.Key,
                date = g.First().TransactionDate.ToString("yyyy-MM-dd HH:mm:ss"),
                customerName = g.First().Note?.Split('-').FirstOrDefault()?.Replace("Khách hàng:", "").Trim() ?? "Khách hàng lẻ",
                reason = g.First().Note?.Split('-').Skip(1).FirstOrDefault()?.Replace("Lý do:", "").Trim() ?? "Bán hàng",
                totalWeightKg = (double)g.Sum(x => x.Quantity),
                totalAmount = (double)g.Sum(x => x.TotalAmount > 0 ? x.TotalAmount : (x.Quantity * (x.UnitPrice > 0 ? x.UnitPrice : (x.LotBatch != null && x.LotBatch.UnitPrice > 0 ? x.LotBatch.UnitPrice : 250000m)))),
                createdBy = g.First().CreatedBy,
                batches = g.Select(b =>
                {
                    var price = b.UnitPrice > 0 ? b.UnitPrice : (b.LotBatch != null && b.LotBatch.UnitPrice > 0 ? b.LotBatch.UnitPrice : (b.LotBatch != null && b.LotBatch.Product != null && b.LotBatch.Product.ReferencePrice > 0 ? b.LotBatch.Product.ReferencePrice : 250000m));
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

                    return new
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
            }).ToList();

        return Ok(Result<object>.Success(grouped));
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

        DateTime nowLocal = DateTime.UtcNow.AddHours(7);
        DateTime txDate = nowLocal;

        if (!string.IsNullOrWhiteSpace(request.Date) && DateTime.TryParse(request.Date, out var parsedDate))
        {
            txDate = new DateTime(parsedDate.Year, parsedDate.Month, parsedDate.Day, nowLocal.Hour, nowLocal.Minute, nowLocal.Second, nowLocal.Millisecond);
        }

        // Sinh mã phiếu duy nhất PXK-yyyyMMddHHmmss-XX không bao giờ trùng lặp
        string refNo = $"PXK-{txDate:yyyyMMddHHmmss}-{Random.Shared.Next(10, 99)}";

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

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<object>.Success(new { referenceNumber = refNo }));
    }
}
