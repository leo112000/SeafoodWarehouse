using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace SeafoodWarehouseManagement.API.Hubs;

/// <summary>
/// SignalR Hub trung tâm quản lý các kết nối Real-time cho thông báo kho và hệ thống
/// </summary>
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var tenantIdStr = httpContext?.Request.Query["tenantId"].ToString() 
                          ?? Context.User?.FindFirst("TenantId")?.Value 
                          ?? Context.User?.FindFirst("tenant_id")?.Value;

        if (int.TryParse(tenantIdStr, out var tenantId) && tenantId > 0)
        {
            // Phân nhóm toàn bộ nhân sự trong Tenant
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Tenant_{tenantId}");

            // Nếu user có role Admin trong Tenant -> Thêm vào nhóm Tenant Admin
            var roles = Context.User?.FindAll(ClaimTypes.Role).Select(r => r.Value).ToList() 
                        ?? Context.User?.FindAll("role").Select(r => r.Value).ToList() 
                        ?? new List<string>();

            if (roles.Contains("Admin") || roles.Contains("Manager"))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Tenant_{tenantId}_Admin");
            }
        }
        else
        {
            // Kết nối của Host Admin / Toàn hệ thống
            await Groups.AddToGroupAsync(Context.ConnectionId, "HostAdmin");
        }

        // Nhóm chung cho tất cả người dùng
        await Groups.AddToGroupAsync(Context.ConnectionId, "AllUsers");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
