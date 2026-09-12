using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Notification;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Quản lý thông báo người dùng và hệ thống (ABP User Notifications)
/// </summary>
[Route("api/[controller]")]
public class NotificationsController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentTenant _currentTenant;

    public NotificationsController(IApplicationDbContext context, ICurrentTenant currentTenant)
    {
        _context = context;
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Lấy danh sách thông báo của User (hoặc Tenant hiện tại)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<List<NotificationDto>>>> GetUserNotifications(
        [FromQuery] int? state,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _currentTenant.Id;

        var query = _context.UserNotifications
            .IgnoreQueryFilters()
            .Where(un => !un.IsDeleted)
            .Include(un => un.Notification)
            .AsQueryable();

        if (tenantId.HasValue && tenantId.Value > 0)
        {
            query = query.Where(un => un.TenantId == tenantId.Value);
        }
        else
        {
            query = query.Where(un => un.TenantId == null);
        }

        if (state.HasValue)
        {
            var targetState = (UserNotificationState)state.Value;
            query = query.Where(un => un.State == targetState);
        }

        var baseList = await query
            .OrderByDescending(un => un.CreatedAt)
            .Select(un => new NotificationDto
            {
                Id = un.Id,
                NotificationId = un.NotificationId,
                Title = un.Notification != null ? un.Notification.Title : string.Empty,
                Message = un.Notification != null ? un.Notification.Message : string.Empty,
                Severity = un.Notification != null ? un.Notification.Severity : "info",
                Link = un.Notification != null ? un.Notification.Link : null,
                DataJson = un.Notification != null ? un.Notification.DataJson : null,
                State = (int)un.State,
                CreatedAt = un.CreatedAt,
                ReadAt = un.ReadAt
            })
            .ToListAsync(cancellationToken);

        // Khử trùng lặp theo NotificationId (do 1 event có thể tạo record cho nhiều user)
        var distinctItems = baseList
            .GroupBy(n => n.NotificationId)
            .Select(g => g.First())
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(Result<List<NotificationDto>>.Success(distinctItems));
    }

    /// <summary>
    /// Lấy số lượng thông báo chưa đọc
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<Result<UnreadCountDto>>> GetUnreadCount(CancellationToken cancellationToken = default)
    {
        var tenantId = _currentTenant.Id;

        var query = _context.UserNotifications
            .IgnoreQueryFilters()
            .Where(un => !un.IsDeleted && un.State == UserNotificationState.Unread);

        if (tenantId.HasValue && tenantId.Value > 0)
        {
            query = query.Where(un => un.TenantId == tenantId.Value);
        }
        else
        {
            query = query.Where(un => un.TenantId == null);
        }

        var count = await query
            .Select(un => un.NotificationId)
            .Distinct()
            .CountAsync(cancellationToken);
        return Ok(Result<UnreadCountDto>.Success(new UnreadCountDto { Count = count }));
    }

    /// <summary>
    /// Đánh dấu 1 thông báo là đã đọc
    /// </summary>
    [HttpPut("{id:int}/read")]
    public async Task<ActionResult<Result>> MarkAsRead(int id, CancellationToken cancellationToken = default)
    {
        var tenantId = _currentTenant.Id;

        var userNotif = await _context.UserNotifications
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(un => un.Id == id && !un.IsDeleted, cancellationToken);

        if (userNotif == null)
        {
            return NotFound(Result.Failure("Không tìm thấy thông báo."));
        }

        if (tenantId.HasValue && tenantId.Value > 0)
        {
            if (userNotif.TenantId != tenantId.Value)
            {
                return NotFound(Result.Failure("Không tìm thấy thông báo."));
            }
        }
        else
        {
            if (userNotif.TenantId != null)
            {
                return NotFound(Result.Failure("Không tìm thấy thông báo."));
            }
        }

        // Đánh dấu tất cả các bản ghi UserNotification thuộc sự kiện này sang trạng thái Read
        var sameNotifs = await _context.UserNotifications
            .IgnoreQueryFilters()
            .Where(un => un.NotificationId == userNotif.NotificationId && !un.IsDeleted)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var item in sameNotifs)
        {
            item.State = UserNotificationState.Read;
            item.ReadAt = now;
            item.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(Result.Success("Đã đánh dấu đã đọc."));
    }

    /// <summary>
    /// Đánh dấu tất cả thông báo là đã đọc
    /// </summary>
    [HttpPut("read-all")]
    public async Task<ActionResult<Result>> MarkAllAsRead(CancellationToken cancellationToken = default)
    {
        var tenantId = _currentTenant.Id;

        var query = _context.UserNotifications
            .IgnoreQueryFilters()
            .Where(un => !un.IsDeleted && un.State == UserNotificationState.Unread);

        if (tenantId.HasValue && tenantId.Value > 0)
        {
            query = query.Where(un => un.TenantId == tenantId.Value);
        }
        else
        {
            query = query.Where(un => un.TenantId == null);
        }

        var unreadList = await query.ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var item in unreadList)
        {
            item.State = UserNotificationState.Read;
            item.ReadAt = now;
            item.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(Result.Success($"Đã đánh dấu {unreadList.Count} thông báo là đã đọc."));
    }

    /// <summary>
    /// Xóa 1 thông báo
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<Result>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var tenantId = _currentTenant.Id;

        var userNotif = await _context.UserNotifications
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(un => un.Id == id && !un.IsDeleted, cancellationToken);

        if (userNotif == null)
        {
            return NotFound(Result.Failure("Không tìm thấy thông báo."));
        }

        if (tenantId.HasValue && tenantId.Value > 0)
        {
            if (userNotif.TenantId != tenantId.Value)
            {
                return NotFound(Result.Failure("Không tìm thấy thông báo."));
            }
        }
        else
        {
            if (userNotif.TenantId != null)
            {
                return NotFound(Result.Failure("Không tìm thấy thông báo."));
            }
        }

        userNotif.IsDeleted = true;
        userNotif.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(Result.Success("Đã xóa thông báo thành công."));
    }
}
