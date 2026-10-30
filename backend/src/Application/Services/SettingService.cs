using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Setting;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Application.Services;

public class SettingService : ISettingService
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ICurrentTenant _currentTenant;

    public SettingService(IApplicationDbContext context, ICacheService cacheService, ICurrentTenant currentTenant)
    {
        _context = context;
        _cacheService = cacheService;
        _currentTenant = currentTenant;
    }

    private string GetCacheKey() => $"settings:{(_currentTenant.Id.HasValue ? $"t{_currentTenant.Id.Value}" : "host")}";

    /// <summary>
    /// Lấy cài đặt hệ thống hiện tại (Nếu chưa có trong DB sẽ khởi tạo mặc định, có Cache)
    /// </summary>
    public async Task<SystemSetting> GetSettingsAsync(CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey();
        return await _cacheService.GetOrCreateAsync(cacheKey, async ct =>
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
    }

    /// <summary>
    /// Cập nhật cài đặt hệ thống vào CSDL và xóa cache
    /// </summary>
    public async Task<Result<SystemSetting>> UpdateSettingsAsync(UpdateSettingDto dto, CancellationToken cancellationToken = default)
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

        return Result<SystemSetting>.Success(setting, "Đã cập nhật cài đặt hệ thống thành công.");
    }
}
