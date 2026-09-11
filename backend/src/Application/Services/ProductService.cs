using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Product;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Interfaces;

namespace SeafoodWarehouseManagement.Application.Services;

/// <summary>
/// Service quản lý sản phẩm thủy hải sản
/// </summary>
public class ProductService : IProductService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProductService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Lấy danh sách sản phẩm có phân trang, có thể lọc theo danh mục
    /// </summary>
    public async Task<PagedResult<ProductDto>> GetAllAsync(PaginationParams pagination, int? categoryId = null, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Product>();
        var (products, totalCount) = await repository.GetPagedAsync(
            pagination.PageNumber,
            pagination.PageSize,
            predicate: p => (!categoryId.HasValue || p.CategoryId == categoryId.Value),
            orderBy: q => q.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id),
            cancellationToken: cancellationToken,
            includes: p => p.Category
        );

        var items = products.Select(MapToDto).ToList();
        return PagedResult<ProductDto>.Create(items, totalCount, pagination.PageNumber, pagination.PageSize);
    }


    /// <summary>
    /// Lấy sản phẩm theo Id
    /// </summary>
    public async Task<ProductDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Product>();
        var product = await repository.GetByIdWithIncludesAsync(id, p => p.Category);

        if (product == null || product.IsDeleted)
            return null;

        return MapToDto(product);
    }

    /// <summary>
    /// Tạo mới sản phẩm
    /// </summary>
    public async Task<Result<ProductDto>> CreateAsync(CreateProductDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra trùng mã sản phẩm
        var repository = _unitOfWork.Repository<Product>();
        var allProducts = await repository.GetAllAsync(cancellationToken);

        // Tự động sinh mã sản phẩm nếu để trống
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            var baseCode = SeafoodWarehouseManagement.Application.Common.Helpers.CodeGeneratorHelper.GenerateCode(dto.Name, "SP");
            var generatedCode = baseCode;
            var counter = 1;
            while (allProducts.Any(p => string.Equals(p.Code, generatedCode, StringComparison.OrdinalIgnoreCase) && !p.IsDeleted))
            {
                generatedCode = $"{baseCode}-{counter:D2}";
                counter++;
            }
            dto.Code = generatedCode;
        }
        else
        {
            dto.Code = dto.Code.Trim().ToUpper();
            if (allProducts.Any(p => string.Equals(p.Code, dto.Code, StringComparison.OrdinalIgnoreCase) && !p.IsDeleted))
            {
                return Result<ProductDto>.Failure($"Mã sản phẩm '{dto.Code}' đã tồn tại.");
            }
        }

        // Kiểm tra danh mục tồn tại
        var categoryRepository = _unitOfWork.Repository<Category>();
        var category = await categoryRepository.GetByIdAsync(dto.CategoryId, cancellationToken);
        if (category == null || category.IsDeleted)
        {
            return Result<ProductDto>.Failure($"Không tìm thấy danh mục với Id = {dto.CategoryId}.");
        }

        var product = new Product
        {
            Code = dto.Code.Trim(),
            Name = dto.Name.Trim(),
            Unit = dto.Unit.Trim(),
            MinimumStock = dto.MinimumStock,
            MaximumStock = dto.MaximumStock,
            TargetTemperature = dto.TargetTemperature,
            ScientificName = dto.ScientificName?.Trim(),
            ReferencePrice = dto.ReferencePrice,
            WarningDaysBeforeExpiry = dto.WarningDaysBeforeExpiry,
            StorageType = dto.StorageType?.Trim() ?? "FROZEN",
            Status = dto.Status?.Trim() ?? "ACTIVE",
            Description = dto.Description?.Trim(),
            CategoryId = dto.CategoryId
        };

        await repository.AddAsync(product, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Reload with Category include
        product = await repository.GetByIdWithIncludesAsync(product.Id, p => p.Category);

        return Result<ProductDto>.Success(MapToDto(product!), "Tạo sản phẩm thành công.");
    }

    /// <summary>
    /// Cập nhật sản phẩm
    /// </summary>
    public async Task<Result<ProductDto>> UpdateAsync(int id, UpdateProductDto dto, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Product>();
        var product = await repository.GetByIdWithIncludesAsync(id, p => p.Category);

        if (product == null || product.IsDeleted)
        {
            return Result<ProductDto>.Failure($"Không tìm thấy sản phẩm với Id = {id}.");
        }

        var codeToUse = !string.IsNullOrWhiteSpace(dto.Code) ? dto.Code.Trim().ToUpper() : product.Code;

        // Kiểm tra trùng mã (loại trừ chính nó)
        var allProducts = await repository.GetAllAsync(cancellationToken);
        if (allProducts.Any(p => string.Equals(p.Code, codeToUse, StringComparison.OrdinalIgnoreCase) && p.Id != id && !p.IsDeleted))
        {
            return Result<ProductDto>.Failure($"Mã sản phẩm '{codeToUse}' đã tồn tại.");
        }

        // Kiểm tra danh mục tồn tại
        var categoryRepository = _unitOfWork.Repository<Category>();
        var category = await categoryRepository.GetByIdAsync(dto.CategoryId, cancellationToken);
        if (category == null || category.IsDeleted)
        {
            return Result<ProductDto>.Failure($"Không tìm thấy danh mục với Id = {dto.CategoryId}.");
        }

        product.Code = codeToUse;
        product.Name = dto.Name.Trim();
        product.Unit = dto.Unit.Trim();
        product.MinimumStock = dto.MinimumStock;
        product.MaximumStock = dto.MaximumStock;
        product.TargetTemperature = dto.TargetTemperature;
        product.ScientificName = dto.ScientificName?.Trim();
        product.ReferencePrice = dto.ReferencePrice;
        product.WarningDaysBeforeExpiry = dto.WarningDaysBeforeExpiry;
        product.StorageType = dto.StorageType?.Trim() ?? "FROZEN";
        product.Status = dto.Status?.Trim() ?? "ACTIVE";
        product.Description = dto.Description?.Trim();
        product.CategoryId = dto.CategoryId;
        product.UpdatedAt = DateTime.UtcNow;

        repository.Update(product);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ProductDto>.Success(MapToDto(product), "Cập nhật sản phẩm thành công.");
    }

    /// <summary>
    /// Xóa mềm sản phẩm (chỉ xóa khi không có lô hàng liên quan)
    /// </summary>
    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Product>();
        var product = await repository.GetByIdWithIncludesAsync(id, p => p.LotBatches);

        if (product == null || product.IsDeleted)
        {
            return Result.Failure($"Không tìm thấy sản phẩm với Id = {id}.");
        }

        // Kiểm tra có lô hàng liên quan không
        var hasLotBatches = product.LotBatches?.Any(l => !l.IsDeleted) ?? false;
        if (hasLotBatches)
        {
            return Result.Failure("Không thể xóa sản phẩm vì đang có lô hàng thuộc sản phẩm này.");
        }

        repository.Delete(product);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Xóa sản phẩm thành công.");
    }

    /// <summary>
    /// Helper: map Product entity → ProductDto (tránh trùng lặp code)
    /// </summary>
    private static ProductDto MapToDto(Product p) => new()
    {
        Id = p.Id,
        Code = p.Code,
        Name = p.Name,
        Unit = p.Unit,
        MinimumStock = p.MinimumStock,
        MaximumStock = p.MaximumStock,
        TargetTemperature = p.TargetTemperature,
        ScientificName = p.ScientificName,
        ReferencePrice = p.ReferencePrice,
        WarningDaysBeforeExpiry = p.WarningDaysBeforeExpiry,
        StorageType = p.StorageType,
        Status = p.Status,
        Description = p.Description,
        CategoryId = p.CategoryId,
        CategoryName = p.Category?.Name ?? string.Empty,
        CreatedAt = p.CreatedAt
    };
}