using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Warehouse;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.Services.Interfaces;

public interface IWarehouseService
{
    Task<PagedResult<WarehouseDto>> GetAllAsync(PaginationParams pagination, StorageType? type = null, CancellationToken cancellationToken = default);
    Task<WarehouseDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Result<WarehouseDto>> CreateAsync(CreateWarehouseDto dto, CancellationToken cancellationToken = default);
    Task<Result<WarehouseDto>> UpdateAsync(int id, UpdateWarehouseDto dto, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
