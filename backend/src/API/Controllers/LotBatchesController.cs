using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.LotBatch;
using SeafoodWarehouseManagement.Application.Services.Interfaces;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API quản lý lô hàng
/// </summary>
[Route("api/[controller]")]
public class LotBatchesController : BaseApiController
{
    private readonly ILotBatchService _lotBatchService;
    private readonly IApplicationDbContext _context;

    public LotBatchesController(ILotBatchService lotBatchService, IApplicationDbContext context)
    {
        _lotBatchService = lotBatchService;
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách lô hàng (có phân trang, lọc theo sản phẩm)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<LotBatchDto>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? productId = null,
        CancellationToken cancellationToken = default)
    {
        var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
        var result = await _lotBatchService.GetAllAsync(pagination, productId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách lô hàng sắp hết hạn trong N ngày tới
    /// </summary>
    [HttpGet("expiring")]
    public async Task<ActionResult<List<LotBatchDto>>> GetExpiring(
        [FromQuery] int daysAhead = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _lotBatchService.GetExpiringAsync(daysAhead, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách lô hàng còn tồn kho, sắp xếp theo FEFO (hạn sử dụng gần nhất trước).
    /// Dùng cho dropdown xuất kho - đảm bảo người dùng thấy lô cận hạn lên đầu.
    /// </summary>
    [HttpGet("fefo")]
    public async Task<ActionResult<Result<object>>> GetFefo(CancellationToken cancellationToken = default)
    {
        var batches = await _context.LotBatches
            .Where(b => !b.IsDeleted && b.CurrentQuantity > 0)
            .Include(b => b.Product)
            .OrderBy(b => b.ExpirationDate)  // FEFO: hết hạn sớm nhất trước
            .Select(b => new
            {
                batchCode    = b.BatchCode,
                productId    = b.ProductId,
                productCode  = b.Product.Code,
                productName  = b.Product.Name,
                expiryDate   = b.ExpirationDate.ToString("yyyy-MM-dd"),
                quantity     = (double)b.CurrentQuantity,
                unitPrice    = (double)b.UnitPrice,
                supplierName = b.SupplierName
            })
            .ToListAsync(cancellationToken);

        return Ok(Result<object>.Success(batches));
    }

    /// <summary>
    /// Lấy lô hàng theo Id
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<LotBatchDto>> GetById(int id, CancellationToken cancellationToken = default)
    {
        var result = await _lotBatchService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = $"Không tìm thấy lô hàng với Id = {id}." });
        }
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới lô hàng và nhập vào kho
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<LotBatchDto>>> Create(CreateLotBatchDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _lotBatchService.CreateAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Xóa mềm lô hàng
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<Result>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var result = await _lotBatchService.DeleteAsync(id, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}