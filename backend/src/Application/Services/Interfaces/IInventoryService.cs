using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Inventory;

namespace SeafoodWarehouseManagement.Application.Services.Interfaces;

public interface IInventoryService
{
    Task<PagedResult<InventoryItemDto>> GetInventoryAsync(PaginationParams pagination, int? warehouseId = null, int? productId = null, CancellationToken cancellationToken = default);
    Task<PagedResult<InventoryTransactionDto>> GetTransactionsAsync(PaginationParams pagination, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<Result<InventoryTransactionDto>> ImportAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default);
    Task<Result<InventoryTransactionDto>> ExportAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default);
    Task<Result<InventoryTransactionDto>> TransferAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default);
}
