using Microsoft.AspNetCore.Mvc;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Product;
using SeafoodWarehouseManagement.Application.Services.Interfaces;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API quản lý sản phẩm thủy hải sản
/// </summary>
[Route("api/[controller]")]
public class ProductsController : BaseApiController
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    /// <summary>
    /// Lấy danh sách sản phẩm (có phân trang, lọc theo danh mục)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? categoryId = null,
        CancellationToken cancellationToken = default)
    {
        var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
        var result = await _productService.GetAllAsync(pagination, categoryId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy sản phẩm theo Id
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> GetById(int id, CancellationToken cancellationToken = default)
    {
        var result = await _productService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = $"Không tìm thấy sản phẩm với Id = {id}." });
        }
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới sản phẩm
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<ProductDto>>> Create(CreateProductDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _productService.CreateAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Cập nhật sản phẩm
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Result<ProductDto>>> Update(int id, UpdateProductDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _productService.UpdateAsync(id, dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Xóa mềm sản phẩm
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<Result>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var result = await _productService.DeleteAsync(id, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}