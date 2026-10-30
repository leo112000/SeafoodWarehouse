using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Setting;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Application.Services.Interfaces;

public interface ISettingService
{
    Task<SystemSetting> GetSettingsAsync(CancellationToken cancellationToken = default);
    Task<Result<SystemSetting>> UpdateSettingsAsync(UpdateSettingDto dto, CancellationToken cancellationToken = default);
}
