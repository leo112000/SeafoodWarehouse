using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

public class CreateWastageDto
{
    public string Mode { get; set; } = "wastage"; // "wastage" hoặc "reclass"
    public string SourceBatchCode { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public string Reason { get; set; } = string.Empty;
    public decimal? NewUnitPrice { get; set; }
    public string? NewExpiryDate { get; set; }
}

/// <summary>
/// API Quản lý Ghi nhận Hao hụt & Chuyển đổi phân loại hải sản
/// </summary>
[Route("api/[controller]")]
public class WastageController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public WastageController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách lịch sử hao hụt & chuyển đổi phân loại từ CSDL
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetAll(CancellationToken cancellationToken = default)
    {
        var transactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Disposal)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var result = transactions.Select(t => new
        {
            id = $"WST-{t.Id}",
            date = t.TransactionDate.ToString("yyyy-MM-dd"),
            type = t.Note?.Contains("Chuyển phân loại") == true ? "Chuyển phân loại" : "Hao hụt",
            seafoodName = t.LotBatch?.Product?.Name ?? "Hải sản",
            batchCode = t.LotBatch?.BatchCode ?? "LOT-001",
            weight = (double)t.Quantity,
            reason = t.Note ?? "Hao hụt / Hư hỏng"
        }).ToList();

        return Ok(Result<object>.Success(result));
    }

    /// <summary>
    /// Ghi nhận hao hụt hoặc chuyển đổi phân loại hải sản và cập nhật CSDL
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<object>>> Create([FromBody] CreateWastageDto dto, CancellationToken cancellationToken = default)
    {
        var lotBatch = await _context.LotBatches
            .Include(b => b.Product)
            .FirstOrDefaultAsync(b => b.BatchCode == dto.SourceBatchCode && !b.IsDeleted, cancellationToken);

        if (lotBatch == null)
        {
            return BadRequest(Result<object>.Failure($"Không tìm thấy lô hàng {dto.SourceBatchCode} trong CSDL."));
        }

        if (dto.Weight > lotBatch.CurrentQuantity)
        {
            return BadRequest(Result<object>.Failure($"Khối lượng hao hụt ({dto.Weight}kg) vượt quá tồn kho hiện tại ({lotBatch.CurrentQuantity}kg)."));
        }

        // 1. Trừ tồn kho lô hàng nguồn
        lotBatch.CurrentQuantity -= dto.Weight;

        // Trừ vị trí tồn kho
        var invItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.LotBatchId == lotBatch.Id && !i.IsDeleted, cancellationToken);
        if (invItem != null)
        {
            invItem.Quantity = Math.Max(0, invItem.Quantity - dto.Weight);
        }

        // 2. Ghi nhận giao dịch Hủy/Hao hụt trong CSDL
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => !w.IsDeleted, cancellationToken);
        var tx = new InventoryTransaction
        {
            ReferenceNumber = $"WST-{DateTime.UtcNow:yyyyMMddHHmmss}",
            Type = TransactionType.Disposal,
            LotBatchId = lotBatch.Id,
            SourceWarehouseId = warehouse?.Id ?? 1,
            Quantity = dto.Weight,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = "Thủ kho",
            Note = dto.Mode == "reclass" ? $"Chuyển phân loại ngợp/ướp đá - Lý do: {dto.Reason}" : $"Hao hụt tự nhiên/hư hỏng - Lý do: {dto.Reason}"
        };

        _context.InventoryTransactions.Add(tx);

        // 3. Nếu là chuyển phân loại, tạo lô hàng mới đại diện cho sản phẩm hạ cấp
        if (dto.Mode == "reclass")
        {
            var newBatchCode = $"LOT-{lotBatch.Product?.Code}-NGOP-{DateTime.UtcNow:yyyyMMdd}";
            var newLot = new LotBatch
            {
                BatchCode = $"LOT-{lotBatch.Product?.Code}-NGOP-{DateTime.UtcNow:yyyyMMddHHmm}",
                ProductId = lotBatch.ProductId,
                ProductionDate = DateTime.UtcNow,
                ExpirationDate = DateTime.TryParse(dto.NewExpiryDate, out var exp) ? exp : DateTime.UtcNow.AddDays(3),
                InitialQuantity = dto.Weight,
                CurrentQuantity = dto.Weight,
                UnitPrice = dto.NewUnitPrice ?? (lotBatch.UnitPrice * 0.6m),
                SupplierName = "Nội bộ (Chuyển phân loại ngợp)"
            };

            _context.LotBatches.Add(newLot);
            await _context.SaveChangesAsync(cancellationToken);

            var newInvItem = new InventoryItem
            {
                WarehouseId = warehouse?.Id ?? 1,
                LotBatchId = newLot.Id,
                StorageBin = "Slot-Chilled",
                Quantity = dto.Weight
            };
            _context.InventoryItems.Add(newInvItem);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<object>.Success(new { message = "Ghi nhận thành công" }));
    }
}
