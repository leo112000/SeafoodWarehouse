using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.LotBatch;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Interfaces;

namespace SeafoodWarehouseManagement.Application.Services;

/// <summary>
/// Service quản lý lô hàng
/// </summary>
public class LotBatchService : ILotBatchService
{
    private readonly IUnitOfWork _unitOfWork;

    public LotBatchService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Lấy danh sách lô hàng có phân trang, có thể lọc theo sản phẩm
    /// </summary>
    public async Task<PagedResult<LotBatchDto>> GetAllAsync(PaginationParams pagination, int? productId = null, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<LotBatch>();
        var lotBatches = await repository.GetAllWithIncludesAsync(l => l.Product);

        // Lọc theo sản phẩm nếu có
        var filtered = lotBatches.Where(l => !l.IsDeleted);
        if (productId.HasValue)
        {
            filtered = filtered.Where(l => l.ProductId == productId.Value);
        }

        var lotBatchList = filtered.ToList();
        var totalCount = lotBatchList.Count;
        var items = lotBatchList
            .OrderByDescending(l => l.CreatedAt)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(l => new LotBatchDto
            {
                Id = l.Id,
                BatchCode = l.BatchCode,
                ProductId = l.ProductId,
                ProductName = l.Product?.Name ?? string.Empty,
                ProductCode = l.Product?.Code ?? string.Empty,
                ProductionDate = l.ProductionDate,
                ExpirationDate = l.ExpirationDate,
                InitialQuantity = l.InitialQuantity,
                CurrentQuantity = l.CurrentQuantity,
                SupplierName = l.SupplierName,
                Grade = l.Grade,
                CertificateCode = l.CertificateCode,
                CreatedAt = l.CreatedAt
            })
            .ToList();

        return PagedResult<LotBatchDto>.Create(items, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Lấy lô hàng theo Id
    /// </summary>
    public async Task<LotBatchDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await repository.GetByIdWithIncludesAsync(id, l => l.Product);

        if (lotBatch == null || lotBatch.IsDeleted)
            return null;

        return new LotBatchDto
        {
            Id = lotBatch.Id,
            BatchCode = lotBatch.BatchCode,
            ProductId = lotBatch.ProductId,
            ProductName = lotBatch.Product?.Name ?? string.Empty,
            ProductCode = lotBatch.Product?.Code ?? string.Empty,
            ProductionDate = lotBatch.ProductionDate,
            ExpirationDate = lotBatch.ExpirationDate,
            InitialQuantity = lotBatch.InitialQuantity,
            CurrentQuantity = lotBatch.CurrentQuantity,
            SupplierName = lotBatch.SupplierName,
            Grade = lotBatch.Grade,
            CertificateCode = lotBatch.CertificateCode,
            CreatedAt = lotBatch.CreatedAt
        };
    }

    /// <summary>
    /// Lấy danh sách lô hàng sắp hết hạn trong khoảng thời gian chỉ định
    /// </summary>
    public async Task<List<LotBatchDto>> GetExpiringAsync(int daysAhead, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<LotBatch>();
        var lotBatches = await repository.GetAllWithIncludesAsync(l => l.Product);

        var now = DateTime.UtcNow;
        var threshold = now.AddDays(daysAhead);

        return lotBatches
            .Where(l => !l.IsDeleted)
            .Where(l => l.CurrentQuantity > 0)
            .Where(l => l.ExpirationDate >= now && l.ExpirationDate <= threshold)
            .OrderBy(l => l.ExpirationDate)
            .Select(l => new LotBatchDto
            {
                Id = l.Id,
                BatchCode = l.BatchCode,
                ProductId = l.ProductId,
                ProductName = l.Product?.Name ?? string.Empty,
                ProductCode = l.Product?.Code ?? string.Empty,
                ProductionDate = l.ProductionDate,
                ExpirationDate = l.ExpirationDate,
                InitialQuantity = l.InitialQuantity,
                CurrentQuantity = l.CurrentQuantity,
                SupplierName = l.SupplierName,
                Grade = l.Grade,
                CertificateCode = l.CertificateCode,
                CreatedAt = l.CreatedAt
            })
            .ToList();
    }

    /// <summary>
    /// Tạo mới lô hàng và nhập vào kho
    /// </summary>
    public async Task<Result<LotBatchDto>> CreateAsync(CreateLotBatchDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra trùng mã lô hàng
        var lotBatchRepository = _unitOfWork.Repository<LotBatch>();
        var existing = await lotBatchRepository.FindAsync(l => l.BatchCode == dto.BatchCode && !l.IsDeleted, cancellationToken);
        if (existing.Any())
        {
            return Result<LotBatchDto>.Failure($"Mã lô hàng '{dto.BatchCode}' đã tồn tại.");
        }

        // Kiểm tra sản phẩm tồn tại
        var productRepository = _unitOfWork.Repository<Product>();
        var product = await productRepository.GetByIdAsync(dto.ProductId, cancellationToken);
        if (product == null || product.IsDeleted)
        {
            return Result<LotBatchDto>.Failure($"Không tìm thấy sản phẩm với Id = {dto.ProductId}.");
        }

        // Kiểm tra kho tồn tại
        var warehouseRepository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await warehouseRepository.GetByIdAsync(dto.WarehouseId, cancellationToken);
        if (warehouse == null || warehouse.IsDeleted)
        {
            return Result<LotBatchDto>.Failure($"Không tìm thấy kho với Id = {dto.WarehouseId}.");
        }

        // Tạo lô hàng mới
        var lotBatch = new LotBatch
        {
            BatchCode = dto.BatchCode.Trim(),
            ProductId = dto.ProductId,
            ProductionDate = dto.ProductionDate,
            ExpirationDate = dto.ExpirationDate,
            InitialQuantity = dto.InitialQuantity,
            CurrentQuantity = dto.InitialQuantity,
            SupplierName = dto.SupplierName.Trim(),
            Grade = dto.Grade,
            CertificateCode = dto.CertificateCode?.Trim()
        };

        await lotBatchRepository.AddAsync(lotBatch, cancellationToken);

        // Tạo InventoryItem cho lô hàng trong kho
        // Lưu ý: sử dụng navigation property để EF Core tự gán FK sau khi lưu lotBatch
        var inventoryRepository = _unitOfWork.Repository<InventoryItem>();
        var inventoryItem = new InventoryItem
        {
            WarehouseId = dto.WarehouseId,
            LotBatch = lotBatch,
            StorageBin = dto.StorageBin.Trim(),
            Quantity = dto.InitialQuantity
        };
        await inventoryRepository.AddAsync(inventoryItem, cancellationToken);

        // Tạo giao dịch nhập kho
        // Lưu ý: sử dụng navigation property để EF Core tự gán FK sau khi lưu lotBatch
        var transactionRepository = _unitOfWork.Repository<InventoryTransaction>();
        var transaction = new InventoryTransaction
        {
            ReferenceNumber = GenerateReferenceNumber("IMP"),
            Type = Domain.Enums.TransactionType.Import,
            LotBatch = lotBatch,
            SourceWarehouseId = dto.WarehouseId,
            DestinationWarehouseId = null,
            Quantity = dto.InitialQuantity,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = "System",
            Note = $"Nhập kho lô hàng {dto.BatchCode}"
        };
        await transactionRepository.AddAsync(transaction, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<LotBatchDto>.Success(new LotBatchDto
        {
            Id = lotBatch.Id,
            BatchCode = lotBatch.BatchCode,
            ProductId = lotBatch.ProductId,
            ProductName = product.Name,
            ProductCode = product.Code,
            ProductionDate = lotBatch.ProductionDate,
            ExpirationDate = lotBatch.ExpirationDate,
            InitialQuantity = lotBatch.InitialQuantity,
            CurrentQuantity = lotBatch.CurrentQuantity,
            SupplierName = lotBatch.SupplierName,
            Grade = lotBatch.Grade,
            CertificateCode = lotBatch.CertificateCode,
            CreatedAt = lotBatch.CreatedAt
        }, "Tạo lô hàng và nhập kho thành công.");
    }

    /// <summary>
    /// Xóa mềm lô hàng (chỉ xóa khi không còn tồn kho)
    /// </summary>
    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await repository.GetByIdWithIncludesAsync(id, l => l.InventoryItems);

        if (lotBatch == null || lotBatch.IsDeleted)
        {
            return Result.Failure($"Không tìm thấy lô hàng với Id = {id}.");
        }

        // Kiểm tra còn tồn kho không
        var hasInventory = lotBatch.InventoryItems?.Any(i => !i.IsDeleted && i.Quantity > 0) ?? false;
        if (hasInventory)
        {
            return Result.Failure("Không thể xóa lô hàng vì vẫn còn hàng tồn trong kho.");
        }

        repository.Delete(lotBatch);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Xóa lô hàng thành công.");
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