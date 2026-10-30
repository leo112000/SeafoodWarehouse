namespace SeafoodWarehouseManagement.Application.Common.Interfaces;

public interface IPermissionCacheService
{
    Task<List<string>> GetUserPermissionsAsync(int userId, int? tenantId, CancellationToken cancellationToken = default);
    Task InvalidateUserPermissionsAsync(int userId, int? tenantId, CancellationToken cancellationToken = default);
    Task InvalidateTenantPermissionsAsync(int? tenantId, CancellationToken cancellationToken = default);
}
