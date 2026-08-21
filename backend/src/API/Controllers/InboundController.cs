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
    public decimal TotalWeight { get; set; }
    public decimal TareWeight { get; set; }
    public decimal NetWeight { get; set; }
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

    public InboundController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách phiếu nhập kho từ CSDL
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
                inboundDate = g.First().TransactionDate.ToString("yyyy-MM-dd"),
                storageLocation = g.First().SourceWarehouse?.Name ?? "Kho chính",
                totalAmount = (double)g.Sum(x => x.Quantity * x.LotBatch.UnitPrice),
                items = g.Select(i => new
                {
                    seafoodName = i.LotBatch?.Product?.Name ?? "Hải sản",
                    seafoodCode = i.LotBatch?.Product?.Code ?? "HS-001",
                    totalWeight = (double)i.Quantity,
                    tareWeight = 0.0,
                    netWeight = (double)i.Quantity,
                    storageCondition = "Cấp đông",
                    catchDate = i.LotBatch?.ProductionDate.ToString("yyyy-MM-dd"),
                    expiryDate = i.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                    unitPrice = (double)(i.LotBatch?.UnitPrice ?? 0),
                    totalPrice = (double)(i.Quantity * (i.LotBatch?.UnitPrice ?? 0)),
                    batchCode = i.LotBatch?.BatchCode ?? "LOT-001"
                }).ToList()
            }).ToList();

        return Ok(Result<object>.Success(grouped));
    }

    /// <summary>
    /// Tạo mới phiếu nhập kho và tự động ghi nhận Lô hàng & Tồn kho trong CSDL
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

        string refNo = $"PNK-{DateTime.UtcNow:yyyyMMddHHmmss}";

        // Tự động tìm category mặc định hoặc tạo mới
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

            if (product == null)
            {
                // Tự động tạo sản phẩm nếu chưa có trong DB
                product = new Product
                {
                    Code = string.IsNullOrWhiteSpace(item.SeafoodCode) ? $"HS-{DateTime.UtcNow:yyyyMMddHHmmss}" : item.SeafoodCode,
                    Name = string.IsNullOrWhiteSpace(item.SeafoodName) ? "Hải sản tươi" : item.SeafoodName,
                    CategoryId = category.Id,
                    Unit = "Kg",
                    StorageType = "FRESH",
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

            // 1. Tạo Lô hàng mới trong CSDL SQL Server
            var lotBatch = new LotBatch
            {
                BatchCode = string.IsNullOrWhiteSpace(item.BatchCode) ? $"LOT-{DateTime.UtcNow:yyyyMMdd}-{product.Code}" : item.BatchCode,
                ProductId = product.Id,
                ProductionDate = DateTime.TryParse(item.CatchDate, out var pDate) ? pDate : DateTime.UtcNow,
                ExpirationDate = DateTime.TryParse(item.ExpiryDate, out var eDate) ? eDate : DateTime.UtcNow.AddMonths(6),
                InitialQuantity = item.NetWeight > 0 ? item.NetWeight : item.TotalWeight,
                CurrentQuantity = item.NetWeight > 0 ? item.NetWeight : item.TotalWeight,
                UnitPrice = item.UnitPrice,
                SupplierName = request.Supplier ?? "Vựa hải sản"
            };

            _context.LotBatches.Add(lotBatch);
            await _context.SaveChangesAsync(cancellationToken);

            // 2. Tạo vị trí tồn kho trong CSDL
            var invItem = new InventoryItem
            {
                WarehouseId = warehouse.Id,
                LotBatchId = lotBatch.Id,
                StorageBin = string.IsNullOrWhiteSpace(request.StorageLocation) ? "Slot-A1" : request.StorageLocation,
                Quantity = lotBatch.CurrentQuantity
            };
            _context.InventoryItems.Add(invItem);

            // 3. Ghi nhận giao dịch nhập kho trong CSDL
            var tx = new InventoryTransaction
            {
                ReferenceNumber = refNo,
                Type = TransactionType.Import,
                LotBatchId = lotBatch.Id,
                SourceWarehouseId = warehouse.Id,
                Quantity = lotBatch.CurrentQuantity,
                TransactionDate = DateTime.UtcNow,
                CreatedBy = "Thủ kho",
                Note = $"Nhà cung cấp: {request.Supplier}"
            };
            _context.InventoryTransactions.Add(tx);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<object>.Success(new { referenceNumber = refNo }));
    }
}
