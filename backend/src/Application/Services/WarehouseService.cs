using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Warehouse;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;
using SeafoodWarehouseManagement.Domain.Interfaces;

namespace SeafoodWarehouseManagement.Application.Services;

/// <summary>
/// Service quản lý kho
/// </summary>
public class WarehouseService : IWarehouseService
{
    private readonly IUnitOfWork _unitOfWork;

    public WarehouseService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Lấy danh sách kho có phân trang, có thể lọc theo loại kho
    /// </summary>
    public async Task<PagedResult<WarehouseDto>> GetAllAsync(PaginationParams pagination, StorageType? type = null, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Warehouse>();
        var warehouses = await repository.GetAllAsync(cancellationToken);

        // Lọc theo loại kho nếu có
        var filtered = warehouses.Where(w => !w.IsDeleted);
        if (type.HasValue)
        {
            filtered = filtered.Where(w => w.Type == type.Value);
        }

        var warehouseList = filtered.ToList();
        var totalCount = warehouseList.Count;
        var items = warehouseList
            .OrderByDescending(w => w.CreatedAt)
            .ThenByDescending(w => w.Id)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(w => new WarehouseDto
            {
                Id = w.Id,
                Code = w.Code,
                Name = w.Name,
                Location = w.Location,
                Type = w.Type,
                TargetTemperature = w.TargetTemperature,
                MaxCapacityTon = w.MaxCapacityTon,
                IsActive = w.IsActive,
                Description = w.Description,
                CreatedAt = w.CreatedAt
            })
            .ToList();

        return PagedResult<WarehouseDto>.Create(items, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Lấy kho theo Id
    /// </summary>
    public async Task<WarehouseDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await repository.GetByIdAsync(id, cancellationToken);

        if (warehouse == null || warehouse.IsDeleted)
            return null;

        return new WarehouseDto
        {
            Id = warehouse.Id,
            Code = warehouse.Code,
            Name = warehouse.Name,
            Location = warehouse.Location,
            Type = warehouse.Type,
            TargetTemperature = warehouse.TargetTemperature,
            MaxCapacityTon = warehouse.MaxCapacityTon,
            IsActive = warehouse.IsActive,
            Description = warehouse.Description,
            CreatedAt = warehouse.CreatedAt
        };
    }

    /// <summary>
    /// Tạo mới kho
    /// </summary>
    public async Task<Result<WarehouseDto>> CreateAsync(CreateWarehouseDto dto, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Warehouse>();

        var all = await repository.GetAllAsync(cancellationToken);

        // Tự động sinh mã kho nếu để trống
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            var baseCode = SeafoodWarehouseManagement.Application.Common.Helpers.CodeGeneratorHelper.GenerateCode(dto.Name, "KHO");
            var generatedCode = baseCode;
            var counter = 1;
            while (all.Any(w => string.Equals(w.Code, generatedCode, StringComparison.OrdinalIgnoreCase) && !w.IsDeleted))
            {
                generatedCode = $"{baseCode}-{counter:D2}";
                counter++;
            }
            dto.Code = generatedCode;
        }
        else
        {
            dto.Code = dto.Code.Trim().ToUpper();
            if (all.Any(w => string.Equals(w.Code, dto.Code, StringComparison.OrdinalIgnoreCase) && !w.IsDeleted))
            {
                return Result<WarehouseDto>.Failure($"Mã kho '{dto.Code}' đã tồn tại.");
            }
        }

        var maxCapacity = dto.MaxCapacityTon > 0 ? dto.MaxCapacityTon : 10;
        var location = !string.IsNullOrWhiteSpace(dto.Location) ? dto.Location.Trim() : "Khu vực chính";
        var description = dto.Description?.Trim();

        var warehouse = new Warehouse
        {
            Code = dto.Code.Trim(),
            Name = dto.Name.Trim(),
            Location = location,
            Type = dto.Type,
            TargetTemperature = dto.TargetTemperature,
            MaxCapacityTon = maxCapacity,
            Description = description,
            IsActive = true
        };

        await repository.AddAsync(warehouse, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<WarehouseDto>.Success(new WarehouseDto
        {
            Id = warehouse.Id,
            Code = warehouse.Code,
            Name = warehouse.Name,
            Location = warehouse.Location,
            Type = warehouse.Type,
            TargetTemperature = warehouse.TargetTemperature,
            MaxCapacityTon = warehouse.MaxCapacityTon,
            IsActive = warehouse.IsActive,
            Description = warehouse.Description,
            CreatedAt = warehouse.CreatedAt
        }, "Tạo kho thành công.");
    }

    /// <summary>
    /// Cập nhật kho
    /// </summary>
    public async Task<Result<WarehouseDto>> UpdateAsync(int id, UpdateWarehouseDto dto, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await repository.GetByIdAsync(id, cancellationToken);

        if (warehouse == null || warehouse.IsDeleted)
        {
            return Result<WarehouseDto>.Failure($"Không tìm thấy kho với Id = {id}.");
        }

        var codeToUse = !string.IsNullOrWhiteSpace(dto.Code) ? dto.Code.Trim().ToUpper() : warehouse.Code;

        // Kiểm tra trùng mã (loại trừ chính nó)
        var existing = await repository.FindAsync(w => w.Code == codeToUse && w.Id != id && !w.IsDeleted, cancellationToken);
        if (existing.Any())
        {
            return Result<WarehouseDto>.Failure($"Mã kho '{codeToUse}' đã tồn tại.");
        }

        var maxCapacity = dto.MaxCapacityTon > 0 ? dto.MaxCapacityTon : (warehouse.MaxCapacityTon > 0 ? warehouse.MaxCapacityTon : 10);
        var location = !string.IsNullOrWhiteSpace(dto.Location) ? dto.Location.Trim() : (warehouse.Location ?? "Khu vực chính");
        var description = dto.Description?.Trim();

        warehouse.Code = codeToUse;
        warehouse.Name = dto.Name.Trim();
        warehouse.Location = location;
        warehouse.Type = dto.Type;
        warehouse.TargetTemperature = dto.TargetTemperature;
        warehouse.MaxCapacityTon = maxCapacity;
        warehouse.Description = description;
        warehouse.IsActive = dto.IsActive;
        warehouse.UpdatedAt = DateTime.UtcNow;

        repository.Update(warehouse);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<WarehouseDto>.Success(new WarehouseDto
        {
            Id = warehouse.Id,
            Code = warehouse.Code,
            Name = warehouse.Name,
            Location = warehouse.Location,
            Type = warehouse.Type,
            TargetTemperature = warehouse.TargetTemperature,
            MaxCapacityTon = warehouse.MaxCapacityTon,
            IsActive = warehouse.IsActive,
            Description = warehouse.Description,
            CreatedAt = warehouse.CreatedAt
        }, "Cập nhật kho thành công.");
    }

    /// <summary>
    /// Xóa mềm kho (chỉ xóa khi không có tồn kho liên quan)
    /// </summary>
    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await repository.GetByIdWithIncludesAsync(id, w => w.InventoryItems);

        if (warehouse == null || warehouse.IsDeleted)
        {
            return Result.Failure($"Không tìm thấy kho với Id = {id}.");
        }

        // Kiểm tra có tồn kho liên quan không
        var hasInventory = warehouse.InventoryItems?.Any(i => !i.IsDeleted) ?? false;
        if (hasInventory)
        {
            return Result.Failure("Không thể xóa kho vì đang có hàng tồn trong kho này.");
        }

        repository.Delete(warehouse);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Xóa kho thành công.");
    }
}