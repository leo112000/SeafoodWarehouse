using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

/// <summary>
/// Thực thể lưu trữ các thông số cài đặt/cấu hình chung cho toàn hệ thống kho
/// </summary>
public class SystemSetting : BaseEntity, IMustHaveTenant
{
    /// <summary>
    /// Số ngày trước khi hết hạn để đưa vào danh sách cảnh báo lô hàng (mặc định: 15 ngày)
    /// </summary>
    public int ExpiringAlertDays { get; set; } = 15;

    /// <summary>
    /// Ngưỡng độ lệch nhiệt độ kho lạnh cảnh báo (°C, mặc định: 3.0°C)
    /// </summary>
    public double TempDeviationThreshold { get; set; } = 3.0;

    /// <summary>
    /// Đơn giá tham chiếu ước tính mặc định (VNĐ/kg, mặc định: 250.000 VNĐ)
    /// </summary>
    public decimal DefaultSeafoodPrice { get; set; } = 250000;

    /// <summary>
    /// Tần suất tự động làm mới Dashboard (giây, mặc định: 30s)
    /// </summary>
    public int AutoRefreshIntervalSeconds { get; set; } = 30;

    /// <summary>
    /// Tỷ lệ % cảnh báo tồn kho tối thiểu (mặc định 100% = nhỏ hơn MinimumStock)
    /// </summary>
    public double LowStockWarningPercent { get; set; } = 100.0;

    public int? TenantId { get; set; }
}
