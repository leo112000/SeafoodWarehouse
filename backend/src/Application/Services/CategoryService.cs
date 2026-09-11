using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Category;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Exceptions;
using SeafoodWarehouseManagement.Domain.Interfaces;

namespace SeafoodWarehouseManagement.Application.Services;

/// <summary>
/// Service quản lý danh mục sản phẩm có tích hợp Hybrid Caching (Redis/Memory)
/// </summary>
public class CategoryService : ICategoryService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly ICurrentTenant _currentTenant;

    public CategoryService(IUnitOfWork unitOfWork, ICacheService cacheService, ICurrentTenant currentTenant)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _currentTenant = currentTenant;
    }

    private string GetCachePrefix() => $"categories:{(_currentTenant.Id.HasValue ? $"t{_currentTenant.Id.Value}" : "host")}:";

    /// <summary>
    /// Lấy danh sách danh mục có phân trang (Cached)
    /// </summary>
    public async Task<PagedResult<CategoryDto>> GetAllAsync(PaginationParams pagination, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{GetCachePrefix()}all_p{pagination.PageNumber}_s{pagination.PageSize}";

        return await _cacheService.GetOrCreateAsync(cacheKey, async ct =>
        {
            var repository = _unitOfWork.Repository<Category>();
            var (categories, totalCount) = await repository.GetPagedAsync(
                pagination.PageNumber,
                pagination.PageSize,
                orderBy: q => q.OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id),
                cancellationToken: ct,
                includes: c => c.Products
            );

            var items = categories
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
        }, TimeSpan.FromMinutes(15), cancellationToken);

    }

    /// <summary>
    /// Lấy danh mục theo Id (Cached)
    /// </summary>
    public async Task<CategoryDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{GetCachePrefix()}id_{id}";

        return await _cacheService.GetOrCreateAsync(cacheKey, async ct =>
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
        }, TimeSpan.FromMinutes(15), cancellationToken);
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
        await _cacheService.RemoveByPrefixAsync(GetCachePrefix(), cancellationToken);

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
        await _cacheService.RemoveByPrefixAsync(GetCachePrefix(), cancellationToken);

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
        await _cacheService.RemoveByPrefixAsync(GetCachePrefix(), cancellationToken);

        return Result.Success("Xóa danh mục thành công.");
    }
}