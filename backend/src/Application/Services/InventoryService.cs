using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Inventory;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;
using SeafoodWarehouseManagement.Domain.Interfaces;

namespace SeafoodWarehouseManagement.Application.Services;

/// <summary>
/// Service quản lý tồn kho và giao dịch nhập/xuất/chuyển kho
/// </summary>
public class InventoryService : IInventoryService
{
    private readonly IUnitOfWork _unitOfWork;

    public InventoryService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Lấy danh sách tồn kho có phân trang, có thể lọc theo kho hoặc sản phẩm
    /// </summary>
    public async Task<PagedResult<InventoryItemDto>> GetInventoryAsync(PaginationParams pagination, int? warehouseId = null, int? productId = null, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<InventoryItem>();
        var items = await repository.GetAllWithIncludesAsync(
            i => i.Warehouse,
            i => i.LotBatch,
            i => i.LotBatch.Product);

        // Lọc theo kho hoặc sản phẩm nếu có
        var filtered = items.Where(i => !i.IsDeleted);
        if (warehouseId.HasValue)
        {
            filtered = filtered.Where(i => i.WarehouseId == warehouseId.Value);
        }
        if (productId.HasValue)
        {
            filtered = filtered.Where(i => i.LotBatch.ProductId == productId.Value);
        }

        var itemList = filtered.ToList();
        var totalCount = itemList.Count;
        var result = itemList
            .OrderBy(i => i.Warehouse?.Code)
            .ThenBy(i => i.LotBatch?.BatchCode)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(i => new InventoryItemDto
            {
                Id = i.Id,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse?.Name ?? string.Empty,
                LotBatchId = i.LotBatchId,
                BatchCode = i.LotBatch?.BatchCode ?? string.Empty,
                ProductName = i.LotBatch?.Product?.Name ?? string.Empty,
                StorageBin = i.StorageBin,
                Quantity = i.Quantity,
                Unit = i.LotBatch?.Product?.Unit ?? "kg",
                ExpirationDate = i.LotBatch?.ExpirationDate ?? DateTime.MinValue,
                Grade = i.LotBatch?.Grade ?? QualityGrade.GradeA
            })
            .ToList();

        return PagedResult<InventoryItemDto>.Create(result, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Lấy lịch sử giao dịch có phân trang, có thể lọc theo kho
    /// </summary>
    public async Task<PagedResult<InventoryTransactionDto>> GetTransactionsAsync(PaginationParams pagination, int? warehouseId = null, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<InventoryTransaction>();
        var transactions = await repository.GetAllWithIncludesAsync(
            t => t.LotBatch,
            t => t.LotBatch.Product,
            t => t.SourceWarehouse,
            t => t.DestinationWarehouse!);

        // Lọc theo kho nếu có (kho nguồn hoặc kho đích)
        var filtered = transactions.Where(t => !t.IsDeleted);
        if (warehouseId.HasValue)
        {
            filtered = filtered.Where(t => t.SourceWarehouseId == warehouseId.Value || t.DestinationWarehouseId == warehouseId.Value);
        }

        var transactionList = filtered.ToList();
        var totalCount = transactionList.Count;
        var result = transactionList
            .OrderByDescending(t => t.TransactionDate)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(t => new InventoryTransactionDto
            {
                Id = t.Id,
                ReferenceNumber = t.ReferenceNumber,
                Type = t.Type,
                LotBatchId = t.LotBatchId,
                BatchCode = t.LotBatch?.BatchCode ?? string.Empty,
                ProductName = t.LotBatch?.Product?.Name ?? string.Empty,
                SourceWarehouseName = t.SourceWarehouse?.Name ?? string.Empty,
                DestinationWarehouseName = t.DestinationWarehouse?.Name,
                Quantity = t.Quantity,
                Unit = t.LotBatch?.Product?.Unit ?? "kg",
                TransactionDate = t.TransactionDate,
                CreatedBy = t.CreatedBy,
                Note = t.Note
            })
            .ToList();

        return PagedResult<InventoryTransactionDto>.Create(result, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Nhập kho: tăng số lượng tồn kho và cập nhật lô hàng
    /// </summary>
    public async Task<Result<InventoryTransactionDto>> ImportAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra lô hàng tồn tại
        var lotBatchRepository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await lotBatchRepository.GetByIdWithIncludesAsync(dto.LotBatchId, l => l.Product);
        if (lotBatch == null || lotBatch.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy lô hàng với Id = {dto.LotBatchId}.");
        }

        // Kiểm tra kho tồn tại
        var warehouseRepository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await warehouseRepository.GetByIdAsync(dto.SourceWarehouseId, cancellationToken);
        if (warehouse == null || warehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho với Id = {dto.SourceWarehouseId}.");
        }

        // Tạo giao dịch nhập kho
        var transactionRepository = _unitOfWork.Repository<InventoryTransaction>();
        var transaction = new InventoryTransaction
        {
            ReferenceNumber = GenerateReferenceNumber("IMP"),
            Type = TransactionType.Import,
            LotBatchId = dto.LotBatchId,
            SourceWarehouseId = dto.SourceWarehouseId,
            DestinationWarehouseId = null,
            Quantity = dto.Quantity,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = dto.CreatedBy,
            Note = dto.Note
        };
        await transactionRepository.AddAsync(transaction, cancellationToken);

        // Tăng số lượng tồn kho của lô hàng
        lotBatch.CurrentQuantity += dto.Quantity;
        lotBatch.UpdatedAt = DateTime.UtcNow;
        lotBatchRepository.Update(lotBatch);

        // Tìm InventoryItem hiện có cho lô hàng trong kho
        var inventoryRepository = _unitOfWork.Repository<InventoryItem>();
        var existingItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.SourceWarehouseId && !i.IsDeleted,
            cancellationToken);

        if (existingItems.Any())
        {
            // Cập nhật số lượng cho item đầu tiên (hoặc item có StorageBin trống)
            var item = existingItems.First();
            item.Quantity += dto.Quantity;
            item.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(item);
        }
        else
        {
            // Tạo mới InventoryItem
            var newItem = new InventoryItem
            {
                WarehouseId = dto.SourceWarehouseId,
                LotBatchId = dto.LotBatchId,
                StorageBin = string.Empty,
                Quantity = dto.Quantity
            };
            await inventoryRepository.AddAsync(newItem, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InventoryTransactionDto>.Success(MapToDto(transaction, lotBatch), "Nhập kho thành công.");
    }

    /// <summary>
    /// Xuất kho: giảm số lượng tồn kho và cập nhật lô hàng
    /// </summary>
    public async Task<Result<InventoryTransactionDto>> ExportAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra lô hàng tồn tại
        var lotBatchRepository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await lotBatchRepository.GetByIdWithIncludesAsync(dto.LotBatchId, l => l.Product);
        if (lotBatch == null || lotBatch.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy lô hàng với Id = {dto.LotBatchId}.");
        }

        // Kiểm tra kho tồn tại
        var warehouseRepository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await warehouseRepository.GetByIdAsync(dto.SourceWarehouseId, cancellationToken);
        if (warehouse == null || warehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho với Id = {dto.SourceWarehouseId}.");
        }

        // Kiểm tra số lượng tồn kho đủ
        if (lotBatch.CurrentQuantity < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng tồn kho không đủ. Hiện có {lotBatch.CurrentQuantity}, yêu cầu xuất {dto.Quantity}.");
        }

        // Tìm InventoryItem trong kho
        var inventoryRepository = _unitOfWork.Repository<InventoryItem>();
        var inventoryItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.SourceWarehouseId && !i.IsDeleted,
            cancellationToken);

        if (!inventoryItems.Any())
        {
            return Result<InventoryTransactionDto>.Failure("Không tìm thấy hàng tồn kho cho lô hàng này trong kho chỉ định.");
        }

        // Kiểm tra tổng số lượng trong kho đủ
        var totalInWarehouse = inventoryItems.Sum(i => i.Quantity);
        if (totalInWarehouse < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng trong kho không đủ. Hiện có {totalInWarehouse}, yêu cầu xuất {dto.Quantity}.");
        }

        // Tạo giao dịch xuất kho
        var transactionRepository = _unitOfWork.Repository<InventoryTransaction>();
        var transaction = new InventoryTransaction
        {
            ReferenceNumber = GenerateReferenceNumber("EXP"),
            Type = TransactionType.Export,
            LotBatchId = dto.LotBatchId,
            SourceWarehouseId = dto.SourceWarehouseId,
            DestinationWarehouseId = null,
            Quantity = dto.Quantity,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = dto.CreatedBy,
            Note = dto.Note
        };
        await transactionRepository.AddAsync(transaction, cancellationToken);

        // Giảm số lượng tồn kho của lô hàng
        lotBatch.CurrentQuantity -= dto.Quantity;
        lotBatch.UpdatedAt = DateTime.UtcNow;
        lotBatchRepository.Update(lotBatch);

        // Giảm số lượng InventoryItem (ưu tiên giảm từ item có số lượng lớn nhất)
        var remainingToExport = dto.Quantity;
        foreach (var item in inventoryItems.OrderByDescending(i => i.Quantity))
        {
            if (remainingToExport <= 0) break;

            var deduct = Math.Min(item.Quantity, remainingToExport);
            item.Quantity -= deduct;
            remainingToExport -= deduct;
            item.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(item);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InventoryTransactionDto>.Success(MapToDto(transaction, lotBatch), "Xuất kho thành công.");
    }

    /// <summary>
    /// Chuyển kho: giảm tồn kho nguồn, tăng tồn kho đích
    /// </summary>
    public async Task<Result<InventoryTransactionDto>> TransferAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra kho đích được chỉ định
        if (!dto.DestinationWarehouseId.HasValue)
        {
            return Result<InventoryTransactionDto>.Failure("Kho đích là bắt buộc khi chuyển kho.");
        }

        // Kiểm tra kho nguồn và kho đích khác nhau
        if (dto.SourceWarehouseId == dto.DestinationWarehouseId.Value)
        {
            return Result<InventoryTransactionDto>.Failure("Kho nguồn và kho đích không được giống nhau.");
        }

        // Kiểm tra lô hàng tồn tại
        var lotBatchRepository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await lotBatchRepository.GetByIdWithIncludesAsync(dto.LotBatchId, l => l.Product);
        if (lotBatch == null || lotBatch.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy lô hàng với Id = {dto.LotBatchId}.");
        }

        // Kiểm tra cả 2 kho tồn tại
        var warehouseRepository = _unitOfWork.Repository<Warehouse>();
        var sourceWarehouse = await warehouseRepository.GetByIdAsync(dto.SourceWarehouseId, cancellationToken);
        if (sourceWarehouse == null || sourceWarehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho nguồn với Id = {dto.SourceWarehouseId}.");
        }

        var destWarehouse = await warehouseRepository.GetByIdAsync(dto.DestinationWarehouseId.Value, cancellationToken);
        if (destWarehouse == null || destWarehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho đích với Id = {dto.DestinationWarehouseId.Value}.");
        }

        // Kiểm tra số lượng tồn kho nguồn đủ
        if (lotBatch.CurrentQuantity < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng tồn kho không đủ. Hiện có {lotBatch.CurrentQuantity}, yêu cầu chuyển {dto.Quantity}.");
        }

        // Tìm InventoryItem ở kho nguồn
        var inventoryRepository = _unitOfWork.Repository<InventoryItem>();
        var sourceItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.SourceWarehouseId && !i.IsDeleted,
            cancellationToken);

        if (!sourceItems.Any())
        {
            return Result<InventoryTransactionDto>.Failure("Không tìm thấy hàng tồn kho ở kho nguồn cho lô hàng này.");
        }

        // Kiểm tra tổng số lượng ở kho nguồn đủ
        var totalInSource = sourceItems.Sum(i => i.Quantity);
        if (totalInSource < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng ở kho nguồn không đủ. Hiện có {totalInSource}, yêu cầu chuyển {dto.Quantity}.");
        }

        // Tạo giao dịch chuyển kho
        var transactionRepository = _unitOfWork.Repository<InventoryTransaction>();
        var transaction = new InventoryTransaction
        {
            ReferenceNumber = GenerateReferenceNumber("TRF"),
            Type = TransactionType.Transfer,
            LotBatchId = dto.LotBatchId,
            SourceWarehouseId = dto.SourceWarehouseId,
            DestinationWarehouseId = dto.DestinationWarehouseId,
            Quantity = dto.Quantity,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = dto.CreatedBy,
            Note = dto.Note
        };
        await transactionRepository.AddAsync(transaction, cancellationToken);

        // Giảm số lượng InventoryItem ở kho nguồn
        var remainingToTransfer = dto.Quantity;
        foreach (var item in sourceItems.OrderByDescending(i => i.Quantity))
        {
            if (remainingToTransfer <= 0) break;

            var deduct = Math.Min(item.Quantity, remainingToTransfer);
            item.Quantity -= deduct;
            remainingToTransfer -= deduct;
            item.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(item);
        }

        // Tăng số lượng InventoryItem ở kho đích
        var destItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.DestinationWarehouseId.Value && !i.IsDeleted,
            cancellationToken);

        if (destItems.Any())
        {
            // Cập nhật số lượng cho item đầu tiên ở kho đích
            var destItem = destItems.First();
            destItem.Quantity += dto.Quantity;
            destItem.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(destItem);
        }
        else
        {
            // Tạo mới InventoryItem ở kho đích
            var newDestItem = new InventoryItem
            {
                WarehouseId = dto.DestinationWarehouseId.Value,
                LotBatchId = dto.LotBatchId,
                StorageBin = string.Empty,
                Quantity = dto.Quantity
            };
            await inventoryRepository.AddAsync(newDestItem, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InventoryTransactionDto>.Success(MapToDto(transaction, lotBatch), "Chuyển kho thành công.");
    }

    /// <summary>
    /// Map InventoryTransaction + LotBatch sang DTO
    /// </summary>
    private static InventoryTransactionDto MapToDto(InventoryTransaction transaction, LotBatch lotBatch)
    {
        return new InventoryTransactionDto
        {
            Id = transaction.Id,
            ReferenceNumber = transaction.ReferenceNumber,
            Type = transaction.Type,
            LotBatchId = transaction.LotBatchId,
            BatchCode = lotBatch.BatchCode,
            ProductName = lotBatch.Product?.Name ?? string.Empty,
            SourceWarehouseName = string.Empty, // Sẽ được set sau khi load
            DestinationWarehouseName = null,
            Quantity = transaction.Quantity,
            Unit = lotBatch.Product?.Unit ?? "kg",
            TransactionDate = transaction.TransactionDate,
            CreatedBy = transaction.CreatedBy,
            Note = transaction.Note
        };
    }

    /// <summary>
    /// Sinh mã tham chiếu giao dịch theo định dạng: PREFIX-YYYYMMDD-XXX
    /// </summary>
    private static string GenerateReferenceNumber(string prefix)
    {
        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        var randomPart = Random.Shared.Next(100, 999).ToString();
        return $"{prefix}-{datePart}-{randomPart}";
    }
}