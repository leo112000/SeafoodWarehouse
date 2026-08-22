using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class AuditLog : BaseEntity, IMustHaveTenant
{
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = "Nhân viên";
    public string Action { get; set; } = "UPDATE"; // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, PRINT
    public string TargetModule { get; set; } = "Kho hàng"; // Danh mục, Kho hàng, Hệ thống, Xác thực
    public string Details { get; set; } = string.Empty;
    public string IpAddress { get; set; } = "127.0.0.1";
    public string Browser { get; set; } = "Chrome / Windows 11";
    public string Status { get; set; } = "SUCCESS"; // SUCCESS, FAILED
    public int ExecutionDurationMs { get; set; } = 50;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public int? TenantId { get; set; }
}
