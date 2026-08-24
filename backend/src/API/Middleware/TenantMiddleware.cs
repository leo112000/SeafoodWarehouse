using System.Web;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;

namespace SeafoodWarehouseManagement.API.Middleware;

/// <summary>
/// Middleware xử lý thông tin Cửa hàng / Chi nhánh (Multi-Tenant Context)
/// - Đọc header '__tenant' hoặc 'X-Tenant-Code' từ Request
/// - Giải mã URL-encode nếu có tiếng Việt
/// - Tìm kiếm Tenant trong CSDL và thiết lập Context làm việc
/// - Nếu không tìm thấy hoặc trống, tự động fallback về cửa hàng mặc định (BIENDONG)
/// </summary>
public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IApplicationDbContext dbContext, ICurrentTenant currentTenant)
    {
        string? tenantIdHeader = context.Request.Headers["X-Tenant-Id"].FirstOrDefault()
                                 ?? context.Request.Headers["Abp.TenantId"].FirstOrDefault()
                                 ?? context.Request.Headers["TenantId"].FirstOrDefault();

        if (int.TryParse(tenantIdHeader, out int parsedTenantId) && parsedTenantId > 0)
        {
            var tenantById = await dbContext.Tenants
                .FirstOrDefaultAsync(t => !t.IsDeleted && t.Id == parsedTenantId);

            if (tenantById != null)
            {
                currentTenant.SetTenant(tenantById.Id, tenantById.Code, tenantById.Name);
                await _next(context);
                return;
            }
        }

        string? rawTenant = context.Request.Headers["__tenant"].FirstOrDefault()
                           ?? context.Request.Headers["X-Tenant-Code"].FirstOrDefault()
                           ?? context.Request.Query["tenant"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(rawTenant))
        {
            try
            {
                string decoded = HttpUtility.UrlDecode(rawTenant).Trim();
                var tenant = await dbContext.Tenants
                    .FirstOrDefaultAsync(t => !t.IsDeleted && (
                        t.Code.ToLower() == decoded.ToLower() || 
                        t.Name.ToLower() == decoded.ToLower()
                    ));

                if (tenant != null)
                {
                    currentTenant.SetTenant(tenant.Id, tenant.Code, tenant.Name);
                }
                else
                {
                    // Fallback to default tenant if not found
                    await SetDefaultTenantAsync(dbContext, currentTenant);
                }
            }
            catch
            {
                await SetDefaultTenantAsync(dbContext, currentTenant);
            }
        }
        else
        {
            await SetDefaultTenantAsync(dbContext, currentTenant);
        }

        await _next(context);
    }

    private static async Task SetDefaultTenantAsync(IApplicationDbContext dbContext, ICurrentTenant currentTenant)
    {
        try
        {
            var defaultTenant = await dbContext.Tenants.FirstOrDefaultAsync(t => !t.IsDeleted);
            if (defaultTenant != null)
            {
                currentTenant.SetTenant(defaultTenant.Id, defaultTenant.Code, defaultTenant.Name);
            }
        }
        catch
        {
            // Fail gracefully if database is still initializing
        }
    }
}
