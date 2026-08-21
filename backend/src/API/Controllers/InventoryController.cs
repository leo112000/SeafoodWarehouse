using Microsoft.AspNetCore.Mvc;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Inventory;
using SeafoodWarehouseManagement.Application.Services.Interfaces;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API quản lý tồn kho và giao dịch nhập/xuất/chuyển kho
/// </summary>
[Route("api/[controller]")]
public class InventoryController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    /// <summary>
    /// Lấy danh sách tồn kho (có phân trang, lọc theo kho hoặc sản phẩm)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<InventoryItemDto>>> GetInventory(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? warehouseId = null,
        [FromQuery] int? productId = null,
        CancellationToken cancellationToken = default)
    {
        var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
        var result = await _inventoryService.GetInventoryAsync(pagination, warehouseId, productId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch sử giao dịch (có phân trang, lọc theo kho)
    /// </summary>
    [HttpGet("transactions")]
    public async Task<ActionResult<PagedResult<InventoryTransactionDto>>> GetTransactions(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
        var result = await _inventoryService.GetTransactionsAsync(pagination, warehouseId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Nhập kho
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult<Result<InventoryTransactionDto>>> Import(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _inventoryService.ImportAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Xuất kho
    /// </summary>
    [HttpPost("export")]
    public async Task<ActionResult<Result<InventoryTransactionDto>>> Export(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _inventoryService.ExportAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Chuyển kho
    /// </summary>
    [HttpPost("transfer")]
    public async Task<ActionResult<Result<InventoryTransactionDto>>> Transfer(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _inventoryService.TransferAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}