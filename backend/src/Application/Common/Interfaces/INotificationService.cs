namespace SeafoodWarehouseManagement.Application.Common.Interfaces;

public class NotificationMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Type { get; set; } = "INFO"; // INBOUND | OUTBOUND | LOW_STOCK | EXPIRY | SYSTEM
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "info"; // info | warning | error | success
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? TenantId { get; set; }
}

public interface INotificationService
{
    Task SendNotificationToTenantAsync(int tenantId, NotificationMessage message, CancellationToken cancellationToken = default);
    Task SendNotificationToTenantAdminsAsync(int tenantId, NotificationMessage message, CancellationToken cancellationToken = default);
    Task SendNotificationToHostAsync(NotificationMessage message, CancellationToken cancellationToken = default);
    Task SendNotificationToAllAsync(NotificationMessage message, CancellationToken cancellationToken = default);
    Task SendStockUpdateEventAsync(int? tenantId, string eventType, CancellationToken cancellationToken = default);
}
