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
            .OrderByDescending(c => c.CreatedAt)
            .ThenByDescending(c => c.Id)
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
        var repository = _unitOfWork.Repository<Category>();
        var allCategories = await repository.GetAllAsync(cancellationToken);

        // Tự động sinh mã danh mục nếu để trống
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            var baseCode = SeafoodWarehouseManagement.Application.Common.Helpers.CodeGeneratorHelper.GenerateCode(dto.Name);
            var generatedCode = baseCode;
            var counter = 1;
            while (allCategories.Any(c => string.Equals(c.Code, generatedCode, StringComparison.OrdinalIgnoreCase) && !c.IsDeleted))
            {
                generatedCode = $"{baseCode}-{counter:D2}";
                counter++;
            }
            dto.Code = generatedCode;
        }
        else
        {
            dto.Code = dto.Code.Trim().ToUpper();
            if (allCategories.Any(c => string.Equals(c.Code, dto.Code, StringComparison.OrdinalIgnoreCase) && !c.IsDeleted))
            {
                return Result<CategoryDto>.Failure($"Mã danh mục '{dto.Code}' đã tồn tại.");
            }
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

        var codeToUse = !string.IsNullOrWhiteSpace(dto.Code) ? dto.Code.Trim().ToUpper() : category.Code;

        // Kiểm tra trùng mã (loại trừ chính nó)
        var allCategories = await repository.GetAllAsync(cancellationToken);
        if (allCategories.Any(c => string.Equals(c.Code, codeToUse, StringComparison.OrdinalIgnoreCase) && c.Id != id && !c.IsDeleted))
        {
            return Result<CategoryDto>.Failure($"Mã danh mục '{codeToUse}' đã tồn tại.");
        }

        category.Code = codeToUse;
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