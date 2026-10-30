using Microsoft.AspNetCore.Mvc;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Warehouse;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API quản lý kho
/// </summary>
[Route("api/[controller]")]
public class WarehousesController : BaseApiController
{
    private readonly IWarehouseService _warehouseService;

    public WarehousesController(IWarehouseService warehouseService)
    {
        _warehouseService = warehouseService;
    }

    /// <summary>
    /// Lấy danh sách kho (có thể lọc theo loại kho, Có Cache)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WarehouseDto>>> GetAll(
        [FromQuery] StorageType? type = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _warehouseService.GetAllAsync(type, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy kho theo Id
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<WarehouseDto>> GetById(int id, CancellationToken cancellationToken = default)
    {
        var result = await _warehouseService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = $"Không tìm thấy kho với Id = {id}." });
        }
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới kho
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<WarehouseDto>>> Create(CreateWarehouseDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _warehouseService.CreateAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Cập nhật kho
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Result<WarehouseDto>>> Update(int id, UpdateWarehouseDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _warehouseService.UpdateAsync(id, dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Xóa mềm kho
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<Result>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var result = await _warehouseService.DeleteAsync(id, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}