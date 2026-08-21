using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Category;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Exceptions;
using SeafoodWarehouseManagement.Domain.Interfaces;

namespace SeafoodWarehouseManagement.Application.Services;

/// <summary>
/// Service quản lý danh mục sản phẩm
/// </summary>
public class CategoryService : ICategoryService
{
    private readonly IUnitOfWork _unitOfWork;

    public CategoryService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Lấy danh sách danh mục có phân trang
    /// </summary>
    public async Task<PagedResult<CategoryDto>> GetAllAsync(PaginationParams pagination, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Category>();
        var categories = await repository.GetAllWithIncludesAsync(c => c.Products);

        // Lọc bỏ danh mục đã xóa mềm (nếu repository chưa filter)
        var activeCategories = categories.Where(c => !c.IsDeleted).ToList();

        var totalCount = activeCategories.Count;
        var items = activeCategories
            .OrderBy(c => c.Code)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                Description = c.Description,
                ProductCount = c.Products?.Count(p => !p.IsDeleted) ?? 0,
                CreatedAt = c.CreatedAt
            })
            .ToList();

        return PagedResult<CategoryDto>.Create(items, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Lấy danh mục theo Id
    /// </summary>
    public async Task<CategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Category>();
        var category = await repository.GetByIdWithIncludesAsync(id, c => c.Products);

        if (category == null || category.IsDeleted)
            return null;

        return new CategoryDto
        {
            Id = category.Id,
            Code = category.Code,
            Name = category.Name,
            Description = category.Description,
            ProductCount = category.Products?.Count(p => !p.IsDeleted) ?? 0,
            CreatedAt = category.CreatedAt
        };
    }

    /// <summary>
    /// Tạo mới danh mục
    /// </summary>
    public async Task<Result<CategoryDto>> CreateAsync(CreateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra trùng mã danh mục
        var repository = _unitOfWork.Repository<Category>();
        var existing = await repository.FindAsync(c => c.Code == dto.Code && !c.IsDeleted, cancellationToken);
        if (existing.Any())
        {
            return Result<CategoryDto>.Failure($"Mã danh mục '{dto.Code}' đã tồn tại.");
        }

        var category = new Category
        {
            Code = dto.Code.Trim(),
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim()
        };

        await repository.AddAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<CategoryDto>.Success(new CategoryDto
        {
            Id = category.Id,
            Code = category.Code,
            Name = category.Name,
            Description = category.Description,
            ProductCount = 0,
            CreatedAt = category.CreatedAt
        }, "Tạo danh mục thành công.");
    }

    /// <summary>
    /// Cập nhật danh mục
    /// </summary>
    public async Task<Result<CategoryDto>> UpdateAsync(int id, UpdateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Category>();
        var category = await repository.GetByIdWithIncludesAsync(id, c => c.Products);

        if (category == null || category.IsDeleted)
        {
            return Result<CategoryDto>.Failure($"Không tìm thấy danh mục với Id = {id}.");
        }

        // Kiểm tra trùng mã (loại trừ chính nó)
        var existing = await repository.FindAsync(c => c.Code == dto.Code && c.Id != id && !c.IsDeleted, cancellationToken);
        if (existing.Any())
        {
            return Result<CategoryDto>.Failure($"Mã danh mục '{dto.Code}' đã tồn tại.");
        }

        category.Code = dto.Code.Trim();
        category.Name = dto.Name.Trim();
        category.Description = dto.Description?.Trim();
        category.UpdatedAt = DateTime.UtcNow;

        repository.Update(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<CategoryDto>.Success(new CategoryDto
        {
            Id = category.Id,
            Code = category.Code,
            Name = category.Name,
            Description = category.Description,
            ProductCount = category.Products?.Count(p => !p.IsDeleted) ?? 0,
            CreatedAt = category.CreatedAt
        }, "Cập nhật danh mục thành công.");
    }

    /// <summary>
    /// Xóa mềm danh mục (chỉ xóa khi không có sản phẩm liên quan)
    /// </summary>
    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Category>();
        var category = await repository.GetByIdWithIncludesAsync(id, c => c.Products);

        if (category == null || category.IsDeleted)
        {
            return Result.Failure($"Không tìm thấy danh mục với Id = {id}.");
        }

        // Kiểm tra có sản phẩm liên quan không
        var hasProducts = category.Products?.Any(p => !p.IsDeleted) ?? false;
        if (hasProducts)
        {
            return Result.Failure("Không thể xóa danh mục vì đang có sản phẩm thuộc danh mục này.");
        }

        repository.Delete(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Xóa danh mục thành công.");
    }
}