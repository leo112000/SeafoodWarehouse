using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.LotBatch;

namespace SeafoodWarehouseManagement.Application.Services.Interfaces;

public interface ILotBatchService
{
    Task<PagedResult<LotBatchDto>> GetAllAsync(PaginationParams pagination, int? productId = null, CancellationToken cancellationToken = default);
    Task<LotBatchDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<List<LotBatchDto>> GetExpiringAsync(int daysAhead, CancellationToken cancellationToken = default);
    Task<Result<LotBatchDto>> CreateAsync(CreateLotBatchDto dto, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
