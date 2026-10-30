using Microsoft.AspNetCore.Mvc;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Setting;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Quản lý Cài đặt / Cấu hình Hệ thống (Thin Controller tuân thủ Clean Architecture)
/// </summary>
[Route("api/[controller]")]
public class SettingsController : BaseApiController
{
    private readonly ISettingService _settingService;

    public SettingsController(ISettingService settingService)
    {
        _settingService = settingService;
    }

    /// <summary>
    /// Lấy cài đặt hệ thống hiện tại (Có Cache)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<SystemSetting>>> GetSettings(CancellationToken cancellationToken = default)
    {
        var result = await _settingService.GetSettingsAsync(cancellationToken);
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
        var result = await _settingService.UpdateSettingsAsync(dto, cancellationToken);
        return Ok(result);
    }
}
