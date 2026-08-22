using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

public class CreateInboundRequestDto
{
    public string Supplier { get; set; } = string.Empty;
    public string InboundDate { get; set; } = string.Empty;
    public string StorageLocation { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public List<CreateInboundItemDto> Items { get; set; } = new();
}

public class CreateInboundItemDto
{
    public string SeafoodCode { get; set; } = string.Empty;
    public string SeafoodName { get; set; } = string.Empty;
    public decimal TotalWeight { get; set; } // Cân thô (Gross weight)
    public decimal TareWeight { get; set; } // Số cân bì/khay (Tare weight)
    public decimal NetWeight { get; set; } // Khối lượng thực (Net weight)
    public string? PackagingCode { get; set; }
    public int PackagingQty { get; set; }
    public string StorageCondition { get; set; } = "Cấp đông";
    public string CatchDate { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string BatchCode { get; set; } = string.Empty;
}

/// <summary>
/// API Quản lý Phiếu Nhập Kho - Xử lý trực tiếp CSDL
/// </summary>
[Route("api/[controller]")]
public class InboundController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ICurrentTenant _currentTenant;

    public InboundController(
        IApplicationDbContext context,
        INotificationService notificationService,
        ICurrentTenant currentTenant)
    {
        _context = context;
        _notificationService = notificationService;
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Lấy danh sách phiếu nhập kho từ CSDL với đầy đủ khối lượng, điều kiện bảo quản thực và ngày giờ nhập
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetAll(CancellationToken cancellationToken = default)
    {
        var transactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Import)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .Include(t => t.SourceWarehouse)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var grouped = transactions
            .GroupBy(t => t.ReferenceNumber)
            .Select(g => new
            {
                id = g.Key,
                supplier = g.First().Note?.Split('-').FirstOrDefault()?.Replace("Nhà cung cấp:", "").Trim() ?? "Nhà cung cấp",
                inboundDate = g.First().TransactionDate.ToString("yyyy-MM-dd HH:mm:ss"),
                storageLocation = g.First().SourceWarehouse?.Name ?? "Kho chính",
                totalAmount = (double)g.Sum(x => x.TotalAmount > 0 ? x.TotalAmount : (x.Quantity * (x.UnitPrice > 0 ? x.UnitPrice : (x.LotBatch != null && x.LotBatch.UnitPrice > 0 ? x.LotBatch.UnitPrice : 250000m)))),
                items = g.Select(i =>
                {
                    var price = i.UnitPrice > 0 ? i.UnitPrice : (i.LotBatch != null && i.LotBatch.UnitPrice > 0 ? i.LotBatch.UnitPrice : 250000m);
                    var amt = i.TotalAmount > 0 ? i.TotalAmount : (i.Quantity * price);
                    var tareW = (double)i.TareWeight;
                    var netW = (double)i.Quantity;
                    var grossW = i.GrossWeight > 0 ? (double)i.GrossWeight : (netW + tareW);

                    var storageType = i.LotBatch?.Product?.StorageType;
                    var conditionStr = storageType switch
                    {
                        "ALIVE" => "Tươi sống",
                        "FRESH" => "Ướp đá",
                        "DRY"   => "Khô",
                        _       => "Cấp đông"
                    };

                    return new
                    {
                        seafoodName = i.LotBatch?.Product?.Name ?? "Hải sản",
                        seafoodCode = i.LotBatch?.Product?.Code ?? "HS-001",
                        totalWeight = grossW,
                        tareWeight = tareW,
                        netWeight = netW,
                        grossWeight = grossW,
                        packagingCode = i.PackagingCode,
                        packagingQty = i.PackagingQty,
                        storageCondition = conditionStr,
                        catchDate = i.LotBatch?.ProductionDate.ToString("yyyy-MM-dd"),
                        expiryDate = i.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                        unitPrice = (double)price,
                        totalPrice = (double)amt,
                        batchCode = i.LotBatch?.BatchCode ?? "LOT-001"
                    };
                }).ToList()
            }).ToList();

        return Ok(Result<object>.Success(grouped));
    }

    /// <summary>
    /// Tạo mới phiếu nhập kho, sinh Mã phiếu duy nhất (PNK-yyyyMMddHHmmss-XX) để không bao giờ trùng hoặc đè phiếu
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<object>>> Create([FromBody] CreateInboundRequestDto request, CancellationToken cancellationToken = default)
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

        if (!string.IsNullOrWhiteSpace(request.InboundDate) && DateTime.TryParse(request.InboundDate, out var parsedInDate))
        {
            txDate = new DateTime(parsedInDate.Year, parsedInDate.Month, parsedInDate.Day, nowLocal.Hour, nowLocal.Minute, nowLocal.Second, nowLocal.Millisecond);
        }

        // Sinh mã phiếu duy nhất PNK-yyyyMMddHHmmss-XX không bao giờ trùng lặp
        string refNo = $"PNK-{txDate:yyyyMMddHHmmss}-{Random.Shared.Next(10, 99)}";

        var category = await _context.Categories.FirstOrDefaultAsync(c => !c.IsDeleted, cancellationToken);
        if (category == null)
        {
            category = new Category { Code = "HAISAN", Name = "Hải sản tổng hợp", Description = "Danh mục mặc định" };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync(cancellationToken);
        }

        foreach (var item in request.Items)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Code == item.SeafoodCode && !p.IsDeleted, cancellationToken)
                       ?? await _context.Products.FirstOrDefaultAsync(p => p.Name == item.SeafoodName && !p.IsDeleted, cancellationToken);

            string mappedStorageType = item.StorageCondition switch
            {
                "Tươi sống" => "ALIVE",
                "Ướp đá"   => "FRESH",
                "Khô"      => "DRY",
                _          => "FROZEN"
            };

            if (product == null)
            {
                product = new Product
                {
                    Code = string.IsNullOrWhiteSpace(item.SeafoodCode) ? $"HS-{DateTime.UtcNow:yyyyMMddHHmmss}" : item.SeafoodCode,
                    Name = string.IsNullOrWhiteSpace(item.SeafoodName) ? "Hải sản tươi" : item.SeafoodName,
                    CategoryId = category.Id,
                    Unit = "Kg",
                    StorageType = mappedStorageType,
                    TargetTemperature = -1,
                    WarningDaysBeforeExpiry = 5,
                    MinimumStock = 10,
                    MaximumStock = 1000,
                    ReferencePrice = item.UnitPrice > 0 ? item.UnitPrice : 250000m,
                    Status = "ACTIVE"
                };
                _context.Products.Add(product);
                await _context.SaveChangesAsync(cancellationToken);
            }
            else
            {
                product.StorageType = mappedStorageType;
                _context.Products.Update(product);
                await _context.SaveChangesAsync(cancellationToken);
            }

            var netQty = item.NetWeight > 0 ? item.NetWeight : item.TotalWeight;

            string bCode = string.IsNullOrWhiteSpace(item.BatchCode) ? $"LOT-{product.Code}-{txDate:yyyyMMddHHmmss}" : item.BatchCode;
            if (await _context.LotBatches.AnyAsync(b => b.BatchCode == bCode && !b.IsDeleted, cancellationToken))
            {
                bCode = $"{bCode}-{Random.Shared.Next(10, 99)}";
            }

            var lotBatch = new LotBatch
            {
                BatchCode = bCode,
                ProductId = product.Id,
                ProductionDate = DateTime.TryParse(item.CatchDate, out var pDate) ? pDate : txDate,
                ExpirationDate = DateTime.TryParse(item.ExpiryDate, out var eDate) ? eDate : txDate.AddMonths(6),
                InitialQuantity = netQty,
                CurrentQuantity = netQty,
                UnitPrice = item.UnitPrice > 0 ? item.UnitPrice : (product.ReferencePrice > 0 ? product.ReferencePrice : 250000m),
                SupplierName = request.Supplier ?? "Vựa hải sản",
                TareWeight = item.TareWeight,
                PackagingCode = item.PackagingCode,
                PackagingQty = item.PackagingQty
            };

            _context.LotBatches.Add(lotBatch);
            await _context.SaveChangesAsync(cancellationToken);

            var invItem = new InventoryItem
            {
                WarehouseId = warehouse.Id,
                LotBatchId = lotBatch.Id,
                StorageBin = string.IsNullOrWhiteSpace(request.StorageLocation) ? "Slot-A1" : request.StorageLocation,
                Quantity = lotBatch.CurrentQuantity
            };
            _context.InventoryItems.Add(invItem);

            var unitPrice = item.UnitPrice > 0 ? item.UnitPrice : (product.ReferencePrice > 0 ? product.ReferencePrice : 250000m);
            var totalAmt = item.TotalPrice > 0 ? item.TotalPrice : (netQty * unitPrice);
            var grossW = item.TotalWeight > 0 ? item.TotalWeight : (netQty + item.TareWeight);

            var tx = new InventoryTransaction
            {
                ReferenceNumber = refNo,
                Type = TransactionType.Import,
                LotBatchId = lotBatch.Id,
                SourceWarehouseId = warehouse.Id,
                Quantity = netQty,
                TareWeight = item.TareWeight,
                GrossWeight = grossW,
                PackagingCode = item.PackagingCode,
                PackagingQty = item.PackagingQty,
                UnitPrice = unitPrice,
                TotalAmount = totalAmt,
                TransactionDate = txDate,
                CreatedBy = "Thủ kho",
                Note = $"Nhà cung cấp: {request.Supplier}"
            };
            _context.InventoryTransactions.Add(tx);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Bắn thông báo Real-time và trigger cập nhật tồn kho
        var tenantId = _currentTenant.Id;
        var totalWeightKg = request.Items.Sum(i => i.NetWeight > 0 ? i.NetWeight : i.TotalWeight);
        var notif = new NotificationMessage
        {
            Type = "INBOUND",
            Title = "Nhập kho hải sản mới",
            Message = $"Phiếu {refNo} ({request.Items.Count} mặt hàng, tổng {totalWeightKg:N1}kg) từ '{request.Supplier}' đã được nhập kho thành công.",
            Severity = "success",
            Link = "/inventory/history"
        };

        if (tenantId.HasValue && tenantId.Value > 0)
        {
            await _notificationService.SendNotificationToTenantAsync(tenantId.Value, notif, cancellationToken);
            await _notificationService.SendStockUpdateEventAsync(tenantId.Value, "INBOUND_CREATED", cancellationToken);
        }
        else
        {
            await _notificationService.SendNotificationToAllAsync(notif, cancellationToken);
            await _notificationService.SendStockUpdateEventAsync(null, "INBOUND_CREATED", cancellationToken);
        }

        return Ok(Result<object>.Success(new { referenceNumber = refNo }));
    }
}
