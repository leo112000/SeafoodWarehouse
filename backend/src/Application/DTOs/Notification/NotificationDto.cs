namespace SeafoodWarehouseManagement.Application.DTOs.Notification;

public class NotificationDto
{
    public int Id { get; set; } // UserNotification Id
    public int NotificationId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public string? Link { get; set; }
    public string? DataJson { get; set; }
    public int State { get; set; } // 0: Unread, 1: Read
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public class UnreadCountDto
{
    public int Count { get; set; }
}
