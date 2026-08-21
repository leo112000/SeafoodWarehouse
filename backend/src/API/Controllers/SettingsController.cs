using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

public class UpdateSettingDto
{
    public int ExpiringAlertDays { get; set; } = 15;
    public double TempDeviationThreshold { get; set; } = 3.0;
    public decimal DefaultSeafoodPrice { get; set; } = 250000;
    public int AutoRefreshIntervalSeconds { get; set; } = 30;
    public double LowStockWarningPercent { get; set; } = 100.0;
}

/// <summary>
/// API Quản lý Cài đặt / Cấu hình Hệ thống
/// </summary>
[Route("api/[controller]")]
public class SettingsController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public SettingsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy cài đặt hệ thống hiện tại (Nếu chưa có trong DB sẽ khởi tạo mặc định)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<SystemSetting>>> GetSettings(CancellationToken cancellationToken = default)
    {
        var setting = await _context.Settings
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (setting == null)
        {
            setting = new SystemSetting
            {
                ExpiringAlertDays = 15,
                TempDeviationThreshold = 3.0,
                DefaultSeafoodPrice = 250000,
                AutoRefreshIntervalSeconds = 30,
                LowStockWarningPercent = 100.0
            };
            _context.Settings.Add(setting);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(Result<SystemSetting>.Success(setting));
    }

    /// <summary>
    /// Cập nhật cài đặt hệ thống vào CSDL
    /// </summary>
    [HttpPut]
    public async Task<ActionResult<Result<SystemSetting>>> UpdateSettings(
        [FromBody] UpdateSettingDto dto,
        CancellationToken cancellationToken = default)
    {
        var setting = await _context.Settings
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (setting == null)
        {
            setting = new SystemSetting();
            _context.Settings.Add(setting);
        }

        setting.ExpiringAlertDays = dto.ExpiringAlertDays > 0 ? dto.ExpiringAlertDays : 15;
        setting.TempDeviationThreshold = dto.TempDeviationThreshold >= 0 ? dto.TempDeviationThreshold : 3.0;
        setting.DefaultSeafoodPrice = dto.DefaultSeafoodPrice >= 0 ? dto.DefaultSeafoodPrice : 250000;
        setting.AutoRefreshIntervalSeconds = dto.AutoRefreshIntervalSeconds >= 5 ? dto.AutoRefreshIntervalSeconds : 30;
        setting.LowStockWarningPercent = dto.LowStockWarningPercent > 0 ? dto.LowStockWarningPercent : 100.0;
        setting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<SystemSetting>.Success(setting, "Đã cập nhật cài đặt hệ thống thành công."));
    }
}
