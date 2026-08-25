using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public List<string> Roles { get; set; } = new();
    public string? TenantName { get; set; } = "Default";
}

public class CreateUserRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = "123456";
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public List<string> Roles { get; set; } = new();
    public string? TenantName { get; set; }
}

public class UpdateUserRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public List<string> Roles { get; set; } = new();
    public string? TenantName { get; set; }
}

/// <summary>
/// API Quản lý Tài khoản Nhân viên (Users / Staff)
/// </summary>
[Route("api/[controller]")]
public class UsersController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public UsersController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách nhân viên
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<List<UserDto>>>> GetAll(CancellationToken cancellationToken = default)
    {
        var users = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted)
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .OrderByDescending(u => u.CreatedAt)
            .ThenByDescending(u => u.Id)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var tenants = await _context.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .ToDictionaryAsync(t => t.Id, t => t.Name, cancellationToken);

        var dtos = users.Select(u => new UserDto
        {
            Id = u.Id.ToString(),
            Name = u.FullName,
            Email = u.Email,
            Phone = u.Phone,
            Status = u.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase) ? "Active" : "Blocked",
            Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList(),
            TenantName = u.TenantId.HasValue && tenants.ContainsKey(u.TenantId.Value) 
                ? tenants[u.TenantId.Value] 
                : (u.TenantId.HasValue ? $"Tenant #{u.TenantId}" : "👑 Host (Toàn hệ thống)")
        }).ToList();

        return Ok(Result<List<UserDto>>.Success(dtos));
    }

    /// <summary>
    /// Lấy chi tiết nhân viên theo Id
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<Result<UserDto>>> GetById(int id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return NotFound(Result<UserDto>.Failure("Không tìm thấy nhân viên."));
        }

        string tenantName = "👑 Host (Toàn hệ thống)";
        if (user.TenantId.HasValue)
        {
            var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == user.TenantId.Value, cancellationToken);
            tenantName = tenant?.Name ?? $"Tenant #{user.TenantId.Value}";
        }

        var dto = new UserDto
        {
            Id = user.Id.ToString(),
            Name = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Status = uStatusToClient(user.Status),
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            TenantName = tenantName
        };

        return Ok(Result<UserDto>.Success(dto));
    }

    private static string uStatusToClient(string status) =>
        status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase) ? "Active" : "Blocked";

    /// <summary>
    /// Tạo mới nhân viên
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<UserDto>>> Create([FromBody] CreateUserRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(Result<UserDto>.Failure("Tên và Email không được để trống."));
        }

        var exists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == request.Email && !u.IsDeleted, cancellationToken);
        if (exists)
        {
            return BadRequest(Result<UserDto>.Failure("Email này đã được sử dụng."));
        }

        var rawPassword = string.IsNullOrWhiteSpace(request.Password) ? "123456" : request.Password;
        var user = new User
        {
            FullName = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword),
            Phone = request.Phone ?? string.Empty,
            Status = request.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) ? "ACTIVE" : "BLOCKED"
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        // Xử lý Roles: Nếu không truyền role nào, mặc định cấp quyền Admin (đặc biệt khi TenantId == null)
        var rolesToAssign = (request.Roles != null && request.Roles.Count > 0)
            ? request.Roles
            : new List<string> { "Admin" };

        var dbRoles = await _context.Roles.IgnoreQueryFilters().Where(r => rolesToAssign.Contains(r.Name)).ToListAsync(cancellationToken);
        
        // Nếu DB chưa có role Admin, tạo role Admin mặc định
        if (dbRoles.Count == 0 && rolesToAssign.Contains("Admin"))
        {
            var defaultAdminRole = new Role { Name = "Admin", Description = "Quản trị viên toàn quyền", IsSystemDefault = true };
            _context.Roles.Add(defaultAdminRole);
            await _context.SaveChangesAsync(cancellationToken);
            dbRoles.Add(defaultAdminRole);
        }

        foreach (var role in dbRoles)
        {
            _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        }
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new UserDto
        {
            Id = user.Id.ToString(),
            Name = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Status = request.Status,
            Roles = dbRoles.Select(r => r.Name).ToList(),
            TenantName = request.TenantName ?? "Default"
        };

        return Ok(Result<UserDto>.Success(dto));
    }

    /// <summary>
    /// Cập nhật thông tin nhân viên
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<Result<UserDto>>> Update(int id, [FromBody] UpdateUserRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return NotFound(Result<UserDto>.Failure("Không tìm thấy nhân viên."));
        }

        user.FullName = request.Name;
        user.Phone = request.Phone ?? user.Phone;
        user.Status = request.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) ? "ACTIVE" : "BLOCKED";

        // Update Roles
        _context.UserRoles.RemoveRange(user.UserRoles);
        if (request.Roles != null && request.Roles.Count > 0)
        {
            var dbRoles = await _context.Roles.IgnoreQueryFilters().Where(r => request.Roles.Contains(r.Name)).ToListAsync(cancellationToken);
            foreach (var role in dbRoles)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var dto = new UserDto
        {
            Id = user.Id.ToString(),
            Name = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Status = request.Status,
            Roles = request.Roles ?? new List<string>(),
            TenantName = request.TenantName ?? "Default"
        };

        return Ok(Result<UserDto>.Success(dto));
    }

    /// <summary>
    /// Thay đổi trạng thái tài khoản nhân viên (Active / Blocked)
    /// </summary>
    [HttpPatch("{id}/status")]
    public async Task<ActionResult<Result<bool>>> ToggleStatus(int id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
        if (user == null)
        {
            return NotFound(Result<bool>.Failure("Không tìm thấy nhân viên."));
        }

        user.Status = user.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase) ? "BLOCKED" : "ACTIVE";
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<bool>.Success(true));
    }

    /// <summary>
    /// Xóa nhân viên
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<Result<bool>>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
        if (user == null)
        {
            return NotFound(Result<bool>.Failure("Không tìm thấy nhân viên."));
        }

        user.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<bool>.Success(true));
    }
}
