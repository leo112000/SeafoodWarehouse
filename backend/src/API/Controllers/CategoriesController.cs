using Microsoft.AspNetCore.Mvc;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Category;
using SeafoodWarehouseManagement.Application.Services.Interfaces;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API quản lý danh mục sản phẩm
/// </summary>
[Route("api/[controller]")]
public class CategoriesController : BaseApiController
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    /// <summary>
    /// Lấy toàn bộ danh mục sản phẩm (Có Cache)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll(CancellationToken cancellationToken = default)
    {
        var result = await _categoryService.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh mục theo Id
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CategoryDto>> GetById(int id, CancellationToken cancellationToken = default)
    {
        var result = await _categoryService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = $"Không tìm thấy danh mục với Id = {id}." });
        }
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới danh mục
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<CategoryDto>>> Create(CreateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _categoryService.CreateAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Cập nhật danh mục
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Result<CategoryDto>>> Update(int id, UpdateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var result = await _categoryService.UpdateAsync(id, dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Xóa mềm danh mục
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<Result>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var result = await _categoryService.DeleteAsync(id, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}