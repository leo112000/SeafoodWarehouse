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
    /// Lấy danh sách phiếu xuất kho từ CSDL
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
                date = g.First().TransactionDate.ToString("yyyy-MM-dd"),
                customerName = g.First().Note?.Split('-').FirstOrDefault()?.Replace("Khách hàng:", "").Trim() ?? "Khách hàng lẻ",
                reason = g.First().Note?.Split('-').Skip(1).FirstOrDefault()?.Replace("Lý do:", "").Trim() ?? "Bán hàng",
                totalWeightKg = (double)g.Sum(x => x.Quantity),
                totalAmount = (double)g.Sum(x => x.Quantity * (x.LotBatch != null && x.LotBatch.UnitPrice > 0 ? x.LotBatch.UnitPrice : 250000m)),
                createdBy = g.First().CreatedBy,
                batches = g.Select(b => new
                {
                    batchCode = b.LotBatch?.BatchCode ?? "LOT-EXPORT",
                    species = b.LotBatch?.Product?.Name ?? "Hải sản",
                    quantityKg = (double)b.Quantity,
                    expiryDate = b.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                    unitPrice = (double)(b.LotBatch?.UnitPrice ?? 250000m),
                    amount = (double)(b.Quantity * (b.LotBatch?.UnitPrice ?? 250000m))
                }).ToList()
            }).ToList();

        return Ok(Result<object>.Success(grouped));
    }

    /// <summary>
    /// Tạo mới phiếu xuất kho và trừ tồn kho trực tiếp trong CSDL theo FEFO
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

        string refNo = $"PXK-{DateTime.UtcNow:yyyyMMddHHmmss}";

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

                // Ghi nhận giao dịch xuất kho CSDL
                var tx = new InventoryTransaction
                {
                    ReferenceNumber = refNo,
                    Type = TransactionType.Export,
                    LotBatchId = lotBatch.Id,
                    SourceWarehouseId = warehouse.Id,
                    Quantity = item.QuantityKg,
                    TransactionDate = DateTime.UtcNow,
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
