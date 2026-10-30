using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

public class RoleDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsSystemDefault { get; set; }
    public List<string> Permissions { get; set; } = new();
}

public class CreateRoleRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
}

/// <summary>
/// API Quản lý Vai trò và Phân quyền (Roles & RolePermissions) từ CSDL bảo mật cao
/// </summary>
[Route("api/[controller]")]
public class RolesController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly IPermissionCacheService _permissionCacheService;
    private readonly ICurrentTenant _currentTenant;

    public RolesController(
        IApplicationDbContext context,
        IPermissionCacheService permissionCacheService,
        ICurrentTenant currentTenant)
    {
        _context = context;
        _permissionCacheService = permissionCacheService;
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Lấy danh sách vai trò và bảng quyền hạn từ CSDL
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<List<RoleDto>>>> GetRoles(CancellationToken cancellationToken = default)
    {
        var dbRoles = await _context.Roles
            .Include(r => r.RolePermissions)
            .Where(r => !r.IsDeleted)
            .OrderByDescending(r => r.Id)
            .ToListAsync(cancellationToken);

        var dtos = dbRoles.Select(r => new RoleDto
        {
            Id = r.Id.ToString(),
            Name = r.Name,
            Description = r.Description,
            IsSystemDefault = r.IsSystemDefault,
            Permissions = r.RolePermissions.Select(p => p.PermissionCode).ToList()
        }).ToList();

        return Ok(Result<List<RoleDto>>.Success(dtos));
    }

    /// <summary>
    /// Tạo mới vai trò và lưu danh sách quyền hạn vào bảng RolePermissions
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<RoleDto>>> Create([FromBody] CreateRoleRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(Result<RoleDto>.Failure("Tên vai trò không được để trống."));
        }

        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == request.Name.ToLower() && !r.IsDeleted, cancellationToken);
        if (exists)
        {
            return BadRequest(Result<RoleDto>.Failure("Tên vai trò này đã tồn tại."));
        }

        var role = new Role
        {
            Name = request.Name,
            Description = request.Description,
            IsSystemDefault = false,
        };

        if (request.Permissions != null && request.Permissions.Count > 0)
        {
            foreach (var permCode in request.Permissions.Distinct())
            {
                role.RolePermissions.Add(new RolePermission
                {
                    PermissionCode = permCode
                });
            }
        }

        _context.Roles.Add(role);
        await _context.SaveChangesAsync(cancellationToken);
        await _permissionCacheService.InvalidateTenantPermissionsAsync(_currentTenant.Id, cancellationToken);

        var dto = new RoleDto
        {
            Id = role.Id.ToString(),
            Name = role.Name,
            Description = role.Description,
            IsSystemDefault = false,
            Permissions = role.RolePermissions.Select(p => p.PermissionCode).ToList()
        };

        return Ok(Result<RoleDto>.Success(dto));
    }

    /// <summary>
    /// Cập nhật vai trò và cập nhật bảng RolePermissions
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<Result<RoleDto>>> Update(int id, [FromBody] CreateRoleRequestDto request, CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);

        if (role == null)
        {
            return NotFound(Result<RoleDto>.Failure("Không tìm thấy vai trò."));
        }

        role.Name = request.Name;
        role.Description = request.Description;

        // Xóa danh sách quyền cũ và gán danh sách quyền mới vào bảng RolePermissions
        _context.RolePermissions.RemoveRange(role.RolePermissions);
        role.RolePermissions.Clear();

        if (request.Permissions != null && request.Permissions.Count > 0)
        {
            foreach (var permCode in request.Permissions.Distinct())
            {
                role.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionCode = permCode
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _permissionCacheService.InvalidateTenantPermissionsAsync(_currentTenant.Id, cancellationToken);

        var dto = new RoleDto
        {
            Id = role.Id.ToString(),
            Name = role.Name,
            Description = role.Description,
            IsSystemDefault = role.IsSystemDefault,
            Permissions = role.RolePermissions.Select(p => p.PermissionCode).ToList()
        };

        return Ok(Result<RoleDto>.Success(dto));
    }

    /// <summary>
    /// Xóa vai trò
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<Result<bool>>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken);
        if (role == null)
        {
            return NotFound(Result<bool>.Failure("Không tìm thấy vai trò."));
        }

        if (role.IsSystemDefault)
        {
            return BadRequest(Result<bool>.Failure("Không thể xóa vai trò mặc định của hệ thống."));
        }

        role.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);
        await _permissionCacheService.InvalidateTenantPermissionsAsync(_currentTenant.Id, cancellationToken);

        return Ok(Result<bool>.Success(true));
    }
}
