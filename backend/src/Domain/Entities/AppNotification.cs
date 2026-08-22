using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

/// <summary>
/// Bảng lưu trữ nội dung thông báo hệ thống
/// </summary>
public class AppNotification : BaseEntity, IMustHaveTenant
{
    public string NotificationName { get; set; } = string.Empty; // Tiêu đề ngắn gọn
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "info"; // info | warning | error | success
    public string? Link { get; set; }
    public string? DataJson { get; set; }
    public int? TenantId { get; set; }

    public ICollection<UserNotification> UserNotifications { get; set; } = new List<UserNotification>();
}
