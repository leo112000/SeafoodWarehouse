using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.API.Hubs;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Services;

public class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IApplicationDbContext _context;

    public SignalRNotificationService(
        IHubContext<NotificationHub> hubContext,
        IApplicationDbContext context)
    {
        _hubContext = hubContext;
        _context = context;
    }

    public async Task SendNotificationToTenantAsync(int tenantId, NotificationMessage message, CancellationToken cancellationToken = default)
    {
        message.TenantId = tenantId;

        // 1. Lưu vào Database (AppNotification)
        var appNotif = new AppNotification
        {
            NotificationName = message.Type,
            Title = message.Title,
            Message = message.Message,
            Severity = message.Severity,
            Link = message.Link,
            TenantId = tenantId,
            CreatedAt = DateTime.UtcNow
        };
        _context.AppNotifications.Add(appNotif);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Tạo UserNotification cho tất cả User thuộc Tenant này
        var targetUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted && u.TenantId == tenantId)
            .Select(u => new { u.Id, u.TenantId })
            .ToListAsync(cancellationToken);

        foreach (var u in targetUsers)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = u.Id,
                TenantId = u.TenantId,
                NotificationId = appNotif.Id,
                State = UserNotificationState.Unread,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync(cancellationToken);

        // 3. Gửi Real-time qua SignalR đến nhóm Tenant đó
        message.Id = appNotif.Id.ToString();
        await _hubContext.Clients.Group($"Tenant_{tenantId}").SendAsync("ReceiveNotification", message, cancellationToken);
    }

    public async Task SendNotificationToTenantAdminsAsync(int tenantId, NotificationMessage message, CancellationToken cancellationToken = default)
    {
        message.TenantId = tenantId;

        // 1. Lưu vào Database (AppNotification)
        var appNotif = new AppNotification
        {
            NotificationName = message.Type,
            Title = message.Title,
            Message = message.Message,
            Severity = message.Severity,
            Link = message.Link,
            TenantId = tenantId,
            CreatedAt = DateTime.UtcNow
        };
        _context.AppNotifications.Add(appNotif);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Chỉ tạo UserNotification cho các Admin / Manager của Tenant này và Host Admin
        var targetUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted && (
                u.TenantId == null || 
                (u.TenantId == tenantId && (u.UserRoles.Count == 0 || u.UserRoles.Any(ur => ur.Role.Name == "Admin" || ur.Role.Name == "Manager")))
            ))
            .Select(u => new { u.Id, u.TenantId })
            .ToListAsync(cancellationToken);

        foreach (var u in targetUsers)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = u.Id,
                TenantId = u.TenantId,
                NotificationId = appNotif.Id,
                State = UserNotificationState.Unread,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync(cancellationToken);

        // 3. Gửi Real-time qua SignalR cho nhóm Tenant và Host Admin
        message.Id = appNotif.Id.ToString();
        await _hubContext.Clients.Group($"Tenant_{tenantId}").SendAsync("ReceiveNotification", message, cancellationToken);
        await _hubContext.Clients.Group("HostAdmin").SendAsync("ReceiveNotification", message, cancellationToken);
    }

    public async Task SendNotificationToHostAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        // 1. Lưu vào Database (Host notification)
        var appNotif = new AppNotification
        {
            NotificationName = message.Type,
            Title = message.Title,
            Message = message.Message,
            Severity = message.Severity,
            Link = message.Link,
            TenantId = null,
            CreatedAt = DateTime.UtcNow
        };
        _context.AppNotifications.Add(appNotif);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Tạo UserNotification cho các Admin thuộc Host
        var hostAdmins = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted && u.TenantId == null)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        foreach (var userId in hostAdmins)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = userId,
                TenantId = null,
                NotificationId = appNotif.Id,
                State = UserNotificationState.Unread,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync(cancellationToken);

        // 3. Gửi Real-time qua SignalR
        message.Id = appNotif.Id.ToString();
        await _hubContext.Clients.Group("HostAdmin").SendAsync("ReceiveNotification", message, cancellationToken);
    }

    public async Task SendNotificationToAllAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        var appNotif = new AppNotification
        {
            NotificationName = message.Type,
            Title = message.Title,
            Message = message.Message,
            Severity = message.Severity,
            Link = message.Link,
            TenantId = null,
            CreatedAt = DateTime.UtcNow
        };
        _context.AppNotifications.Add(appNotif);
        await _context.SaveChangesAsync(cancellationToken);

        var allUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted)
            .Select(u => new { u.Id, u.TenantId })
            .ToListAsync(cancellationToken);

        foreach (var u in allUsers)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = u.Id,
                TenantId = u.TenantId,
                NotificationId = appNotif.Id,
                State = UserNotificationState.Unread,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync(cancellationToken);

        message.Id = appNotif.Id.ToString();
        await _hubContext.Clients.Group("AllUsers").SendAsync("ReceiveNotification", message, cancellationToken);
    }

    public async Task SendStockUpdateEventAsync(int? tenantId, string eventType, CancellationToken cancellationToken = default)
    {
        if (tenantId.HasValue && tenantId.Value > 0)
        {
            await _hubContext.Clients.Group($"Tenant_{tenantId.Value}").SendAsync("StockUpdated", new { eventType, tenantId = tenantId.Value }, cancellationToken);
            await _hubContext.Clients.Group("HostAdmin").SendAsync("StockUpdated", new { eventType, tenantId = tenantId.Value }, cancellationToken);
        }
        else
        {
            await _hubContext.Clients.Group("AllUsers").SendAsync("StockUpdated", new { eventType }, cancellationToken);
        }
    }
}
