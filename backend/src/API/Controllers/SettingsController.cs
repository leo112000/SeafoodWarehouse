using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

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

/// <summary>
/// API Quản lý Cài đặt / Cấu hình Hệ thống
/// </summary>
[Route("api/[controller]")]
public class SettingsController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ICurrentTenant _currentTenant;

    public SettingsController(IApplicationDbContext context, ICacheService cacheService, ICurrentTenant currentTenant)
    {
        _context = context;
        _cacheService = cacheService;
        _currentTenant = currentTenant;
    }

    private string GetCacheKey() => $"settings:{(_currentTenant.Id.HasValue ? $"t{_currentTenant.Id.Value}" : "host")}";

    /// <summary>
    /// Lấy cài đặt hệ thống hiện tại (Nếu chưa có trong DB sẽ khởi tạo mặc định, có Cache)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<SystemSetting>>> GetSettings(CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey();
        var result = await _cacheService.GetOrCreateAsync(cacheKey, async ct =>
        {
            var setting = await _context.Settings
                .Where(s => !s.IsDeleted)
                .FirstOrDefaultAsync(ct);

            if (setting == null)
            {
                setting = new SystemSetting
                {
                    WebsiteName = "KHO HẢI SẢN",
                    LogoUrl = "",
                    ExpiringAlertDays = 15,
                    TempDeviationThreshold = 3.0,
                    DefaultSeafoodPrice = 250000,
                    AutoRefreshIntervalSeconds = 30,
                    LowStockWarningPercent = 100.0
                };
                _context.Settings.Add(setting);
                await _context.SaveChangesAsync(ct);
            }

            return setting;
        }, TimeSpan.FromHours(1), cancellationToken);

        return Ok(Result<SystemSetting>.Success(result));
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

        if (dto != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.WebsiteName))
                setting.WebsiteName = dto.WebsiteName.Trim();

            if (dto.LogoUrl != null)
                setting.LogoUrl = dto.LogoUrl.Trim();

            if (dto.ExpiringAlertDays.HasValue && dto.ExpiringAlertDays.Value > 0)
                setting.ExpiringAlertDays = dto.ExpiringAlertDays.Value;

            if (dto.TempDeviationThreshold.HasValue && dto.TempDeviationThreshold.Value >= 0)
                setting.TempDeviationThreshold = dto.TempDeviationThreshold.Value;

            if (dto.DefaultSeafoodPrice.HasValue && dto.DefaultSeafoodPrice.Value >= 0)
                setting.DefaultSeafoodPrice = dto.DefaultSeafoodPrice.Value;

            if (dto.AutoRefreshIntervalSeconds.HasValue && dto.AutoRefreshIntervalSeconds.Value >= 5)
                setting.AutoRefreshIntervalSeconds = dto.AutoRefreshIntervalSeconds.Value;

            if (dto.LowStockWarningPercent.HasValue && dto.LowStockWarningPercent.Value > 0)
                setting.LowStockWarningPercent = dto.LowStockWarningPercent.Value;
        }

        setting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        await _cacheService.RemoveAsync(GetCacheKey(), cancellationToken);

        return Ok(Result<SystemSetting>.Success(setting, "Đã cập nhật cài đặt hệ thống thành công."));
    }
}
