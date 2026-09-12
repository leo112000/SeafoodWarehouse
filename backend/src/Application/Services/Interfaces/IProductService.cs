using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Product;

namespace SeafoodWarehouseManagement.Application.Services.Interfaces;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetAllAsync(PaginationParams pagination, int? categoryId = null, CancellationToken cancellationToken = default);
    Task<ProductDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Result<ProductDto>> CreateAsync(CreateProductDto dto, CancellationToken cancellationToken = default);
    Task<Result<BatchProductResultDto>> CreateBatchAsync(IEnumerable<CreateProductDto> dtos, CancellationToken cancellationToken = default);
    Task<Result<ProductDto>> UpdateAsync(int id, UpdateProductDto dto, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}

