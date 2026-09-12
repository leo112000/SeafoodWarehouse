using Microsoft.AspNetCore.Mvc;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Tenant;
using SeafoodWarehouseManagement.Application.Services.Interfaces;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Quản lý Cửa hàng / Chi nhánh (Multi-Tenant)
/// </summary>
[Route("api/[controller]")]
public class TenantsController : BaseApiController
{
    private readonly ITenantService _tenantService;
    private readonly INotificationService _notificationService;
    private readonly ICurrentTenant _currentTenant;

    public TenantsController(ITenantService tenantService, INotificationService notificationService, ICurrentTenant currentTenant)
    {
        _tenantService = tenantService;
        _notificationService = notificationService;
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Lấy danh sách tất cả Cửa hàng / Chi nhánh
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<TenantDto>>> GetAll(CancellationToken cancellationToken = default)
    {
        if (_currentTenant.Id.HasValue)
        {
            return StatusCode(403, new { message = "Chỉ Quản trị viên cấp cao (Host Admin) mới có quyền truy cập danh sách Cửa hàng / Chi nhánh." });
        }

        var result = await _tenantService.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin Cửa hàng theo Id
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TenantDto>> GetById(int id, CancellationToken cancellationToken = default)
    {
        if (_currentTenant.Id.HasValue && _currentTenant.Id.Value != id)
        {
            return StatusCode(403, new { message = "Bạn không có quyền truy cập thông tin của chi nhánh khác." });
        }
        var result = await _tenantService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = $"Không tìm thấy Cửa hàng với Id = {id}." });
        }
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin Cửa hàng theo Mã (Code)
    /// </summary>
    [HttpGet("code/{code}")]
    public async Task<ActionResult<TenantDto>> GetByCode(string code, CancellationToken cancellationToken = default)
    {
        var result = await _tenantService.GetByCodeAsync(code, cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = $"Không tìm thấy Cửa hàng với mã '{code}'." });
        }
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới Cửa hàng / Chi nhánh
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<TenantDto>>> Create([FromBody] CreateTenantDto dto, CancellationToken cancellationToken = default)
    {
        if (_currentTenant.Id.HasValue)
        {
            return StatusCode(403, Result<TenantDto>.Failure("Chỉ Quản trị viên cấp cao (Host Admin) mới có quyền tạo mới Cửa hàng / Chi nhánh."));
        }

        var result = await _tenantService.CreateAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        // Bắn thông báo Real-time cho Host Admin
        await _notificationService.SendNotificationToHostAsync(new NotificationMessage
        {
            Type = "TENANT_CREATED",
            Title = "Doanh nghiệp mới",
            Message = $"Đơn vị thuê mới '{dto.Name}' (Mã: {dto.Code}) vừa được khởi tạo thành công.",
            Severity = "success",
            Link = "/system/tenants"
        }, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Cập nhật thông tin Cửa hàng / Chi nhánh
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Result<TenantDto>>> Update(int id, [FromBody] UpdateTenantDto dto, CancellationToken cancellationToken = default)
    {
        if (_currentTenant.Id.HasValue)
        {
            return StatusCode(403, Result<TenantDto>.Failure("Chỉ Quản trị viên cấp cao (Host Admin) mới có quyền cập nhật Cửa hàng / Chi nhánh."));
        }

        var result = await _tenantService.UpdateAsync(id, dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        await _notificationService.SendNotificationToTenantAdminsAsync(id, new NotificationMessage
        {
            Type = "TENANT_UPDATED",
            Title = "Cập nhật thông tin công ty",
            Message = $"Thông tin doanh nghiệp '{dto.Name}' vừa được cập nhật.",
            Severity = "info",
            Link = "/system/tenants"
        }, cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// Xóa Cửa hàng / Chi nhánh (Xóa mềm)
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<Result>> Delete(int id, CancellationToken cancellationToken = default)
    {
        if (_currentTenant.Id.HasValue)
        {
            return StatusCode(403, Result.Failure("Chỉ Quản trị viên cấp cao (Host Admin) mới có quyền xóa Cửa hàng / Chi nhánh."));
        }

        var result = await _tenantService.DeleteAsync(id, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }

        await _notificationService.SendNotificationToHostAsync(new NotificationMessage
        {
            Type = "TENANT_DELETED",
            Title = "Đã xóa doanh nghiệp",
            Message = $"Đơn vị thuê ID #{id} đã được xóa thành công.",
            Severity = "warning",
            Link = "/system/tenants"
        }, cancellationToken);

        return Ok(result);
    }
}
