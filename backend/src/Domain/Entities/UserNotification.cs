using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public enum UserNotificationState
{
    Unread = 0,
    Read = 1
}

/// <summary>
/// Bảng lưu trạng thái nhận và đọc thông báo của từng User (ABP Notification pattern)
/// </summary>
public class UserNotification : BaseEntity, IMustHaveTenant
{
    public int UserId { get; set; }
    public User? User { get; set; }

    public int NotificationId { get; set; }
    public AppNotification? Notification { get; set; }

    public UserNotificationState State { get; set; } = UserNotificationState.Unread;
    public DateTime? ReadAt { get; set; }
    public int? TenantId { get; set; }
}
