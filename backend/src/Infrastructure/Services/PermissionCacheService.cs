using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;

namespace SeafoodWarehouseManagement.Infrastructure.Services;

public class PermissionCacheService : IPermissionCacheService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public PermissionCacheService(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    private static string GetCacheKey(int userId, int? tenantId) =>
        $"user_permissions:t{tenantId ?? 0}:u{userId}";

    private static string GetTenantPrefix(int? tenantId) =>
        $"user_permissions:t{tenantId ?? 0}:";

    public async Task<List<string>> GetUserPermissionsAsync(int userId, int? tenantId, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey(userId, tenantId);

        return await _cacheService.GetOrCreateAsync(cacheKey, async ct =>
        {
            // Truy vấn danh sách RoleId của User
            var roleIds = await _context.UserRoles
                .Where(ur => ur.UserId == userId && !ur.IsDeleted)
                .Select(ur => ur.RoleId)
                .ToListAsync(ct);

            if (roleIds.Count == 0)
            {
                return new List<string>();
            }

            // Lấy danh sách PermissionCode duy nhất từ bảng RolePermissions
            var permissions = await _context.RolePermissions
                .Where(rp => roleIds.Contains(rp.RoleId) && !rp.IsDeleted)
                .Select(rp => rp.PermissionCode)
                .Distinct()
                .ToListAsync(ct);

            return permissions;
        }, TimeSpan.FromHours(1), cancellationToken);
    }

    public async Task InvalidateUserPermissionsAsync(int userId, int? tenantId, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey(userId, tenantId);
        await _cacheService.RemoveAsync(cacheKey, cancellationToken);
    }

    public async Task InvalidateTenantPermissionsAsync(int? tenantId, CancellationToken cancellationToken = default)
    {
        var prefix = GetTenantPrefix(tenantId);
        await _cacheService.RemoveByPrefixAsync(prefix, cancellationToken);
    }
}
