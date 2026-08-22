using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Tenant;

namespace SeafoodWarehouseManagement.Application.Services.Interfaces;

public interface ITenantService
{
    Task<List<TenantDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TenantDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<TenantDto?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<Result<TenantDto>> CreateAsync(CreateTenantDto dto, CancellationToken cancellationToken = default);
    Task<Result<TenantDto>> UpdateAsync(int id, UpdateTenantDto dto, CancellationToken cancellationToken = default);
    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
