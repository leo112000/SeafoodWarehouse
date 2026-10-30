namespace SeafoodWarehouseManagement.Application.DTOs.Setting;

public class UpdateSettingDto
{
    public string? WebsiteName { get; set; }
    public string? LogoUrl { get; set; }
    public int? ExpiringAlertDays { get; set; }
    public double? TempDeviationThreshold { get; set; }
    public decimal? DefaultSeafoodPrice { get; set; }
    public int? AutoRefreshIntervalSeconds { get; set; }
    public double? LowStockWarningPercent { get; set; }
}
