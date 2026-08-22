using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SeafoodWarehouseManagement.Application.Common.Interfaces;

namespace SeafoodWarehouseManagement.Infrastructure.Services;

public class CurrentTenantService : ICurrentTenant
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private int? _explicitTenantId;
    private string? _explicitCode;
    private string? _explicitName;

    public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? Id
    {
        get
        {
            if (_explicitTenantId.HasValue) return _explicitTenantId;
            
            var user = _httpContextAccessor.HttpContext?.User;
            var tenantClaim = user?.FindFirst("TenantId")?.Value 
                              ?? user?.FindFirst("tenant_id")?.Value;

            if (int.TryParse(tenantClaim, out var id) && id > 0)
            {
                return id;
            }

            // Hoặc trích xuất từ Header X-Tenant-Id
            var headerTenant = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].ToString();
            if (int.TryParse(headerTenant, out var headerId) && headerId > 0)
            {
                return headerId;
            }

            return null;
        }
    }

    public string? Code => _explicitCode ?? _httpContextAccessor.HttpContext?.User?.FindFirst("TenantCode")?.Value;
    public string? Name => _explicitName ?? _httpContextAccessor.HttpContext?.User?.FindFirst("TenantName")?.Value;

    public void SetTenant(int? id, string? code, string? name)
    {
        _explicitTenantId = id;
        _explicitCode = code;
        _explicitName = name;
    }
}
