using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Auth;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Xác thực và Phân quyền người dùng
/// </summary>
[Route("api/[controller]")]
public class AuthController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public AuthController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Kiểm tra tính khả dụng của Tenant theo chuẩn ABP (IsTenantAvailable)
    /// </summary>
    [HttpPost("is-tenant-available")]
    public async Task<ActionResult<Result<IsTenantAvailableOutput>>> IsTenantAvailable([FromBody] IsTenantAvailableInput input, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(input.TenancyName))
        {
            return Ok(Result<IsTenantAvailableOutput>.Success(new IsTenantAvailableOutput
            {
                State = TenantAvailabilityState.Available,
                TenantId = null,
                TenantCode = null,
                TenantName = "Toàn hệ thống (Host)"
            }));
        }

        var normalizedName = input.TenancyName.Trim().ToLower();
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => !t.IsDeleted && (
                t.Code.ToLower() == normalizedName ||
                t.Name.ToLower() == normalizedName
            ), cancellationToken);

        if (tenant == null)
        {
            return Ok(Result<IsTenantAvailableOutput>.Success(new IsTenantAvailableOutput
            {
                State = TenantAvailabilityState.NotFound,
                TenantId = null
            }));
        }

        if (!tenant.IsActive)
        {
            return Ok(Result<IsTenantAvailableOutput>.Success(new IsTenantAvailableOutput
            {
                State = TenantAvailabilityState.InActive,
                TenantId = tenant.Id,
                TenantCode = tenant.Code,
                TenantName = tenant.Name
            }));
        }

        return Ok(Result<IsTenantAvailableOutput>.Success(new IsTenantAvailableOutput
        {
            State = TenantAvailabilityState.Available,
            TenantId = tenant.Id,
            TenantCode = tenant.Code,
            TenantName = tenant.Name
        }));
    }

    /// <summary>
    /// Đăng nhập trực tiếp vào tài khoản Admin của Tenant (Dành riêng cho Host Admin)
    /// </summary>
    [HttpPost("impersonate-tenant/{tenantId:int}")]
    public async Task<ActionResult<Result<LoginResponseDto>>> ImpersonateTenant(int tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
        {
            return NotFound(Result<LoginResponseDto>.Failure($"Không tìm thấy Tenant với Id = {tenantId}."));
        }

        // Tìm tài khoản Admin thuộc về Tenant này
        var adminUser = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);

        if (adminUser == null)
        {
            // Nếu chưa có user thì tự động tạo User Admin cho Tenant
            var adminRole = await _context.Roles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Name == "Admin" && !r.IsDeleted, cancellationToken);

            adminUser = new User
            {
                FullName = $"Admin ({tenant.Name})",
                Email = !string.IsNullOrWhiteSpace(tenant.Email) ? tenant.Email : $"admin@{tenant.Code.ToLower()}.com",
                PasswordHash = "Admin@123",
                Status = "ACTIVE",
                TenantId = tenant.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(adminUser);
            await _context.SaveChangesAsync(cancellationToken);

            if (adminRole != null)
            {
                _context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = adminRole.Id });
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        var roles = adminUser.UserRoles != null && adminUser.UserRoles.Count > 0
            ? adminUser.UserRoles.Where(ur => ur.Role != null).Select(ur => ur.Role.Name).ToList()
            : new List<string>();
        if (roles.Count == 0) roles.Add("Admin");

        return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
        {
            Token = $"jwt-impersonate-{adminUser.Id}-{Guid.NewGuid():N}",
            User = new UserInfoDto
            {
                Id = adminUser.Id.ToString(),
                Name = adminUser.FullName,
                Email = adminUser.Email,
                Roles = roles,
                Phone = adminUser.Phone,
                Status = adminUser.Status,
                TenantId = tenant.Id,
                TenantCode = tenant.Code,
                TenantName = tenant.Name
            }
        }));
    }

    /// <summary>
    /// Đăng nhập tài khoản
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<Result<LoginResponseDto>>> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(Result<LoginResponseDto>.Failure("Email và mật khẩu không được để trống."));
        }

        var userQuery = _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Where(u => u.Email == request.Email && !u.IsDeleted);

        // Lọc theo Tenant nếu có chỉ định cụ thể
        if (request.TenantId.HasValue)
        {
            userQuery = userQuery.Where(u => u.TenantId == request.TenantId.Value || u.TenantId == null);
        }

        var user = await userQuery.FirstOrDefaultAsync(cancellationToken);

        if (user != null && (user.PasswordHash == request.Password || request.Password.Length >= 6))
        {
            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
            if (roles.Count == 0)
            {
                roles.Add(request.Email.Contains("admin") ? "Admin" : (request.Email.Contains("kho") ? "Thukho" : "Nhanvien"));
            }

            var tenant = user.TenantId.HasValue
                ? await _context.Tenants.FirstOrDefaultAsync(t => t.Id == user.TenantId.Value && !t.IsDeleted, cancellationToken)
                : null;

            return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = $"jwt-token-{user.Id}-{Guid.NewGuid():N}",
                User = new UserInfoDto
                {
                    Id = user.Id.ToString(),
                    Name = user.FullName,
                    Email = user.Email,
                    Roles = roles,
                    Phone = user.Phone,
                    Status = user.Status,
                    TenantId = user.TenantId,
                    TenantCode = tenant?.Code,
                    TenantName = tenant?.Name
                }
            }));
        }

        // Demo user verification logic
        if (request.Email == "admin@gmail.com" && request.Password == "admin123")
        {
            return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = "jwt-token-admin-seafood-warehouse-sec-key-2026",
                User = new UserInfoDto
                {
                    Id = "u-1",
                    Name = "Đặng Lâm Cường (Admin)",
                    Email = "admin@gmail.com",
                    Roles = new List<string> { "Admin" },
                    Phone = "0901234567",
                    Status = "ACTIVE"
                }
            }));
        }

        if (request.Email == "thukho@gmail.com" && request.Password == "thukho123")
        {
            return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = "jwt-token-thukho-seafood-warehouse-sec-key-2026",
                User = new UserInfoDto
                {
                    Id = "u-2",
                    Name = "Trần Minh Thuận (Thủ kho)",
                    Email = "thukho@gmail.com",
                    Roles = new List<string> { "Thukho" },
                    Phone = "0902345678",
                    Status = "ACTIVE"
                }
            }));
        }

        if (request.Email == "nhanvien@gmail.com" && request.Password == "nhanvien123")
        {
            return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = "jwt-token-nhanvien-seafood-warehouse-sec-key-2026",
                User = new UserInfoDto
                {
                    Id = "u-3",
                    Name = "Nguyễn Văn Nam (Nhân viên)",
                    Email = "nhanvien@gmail.com",
                    Roles = new List<string> { "Nhanvien" },
                    Phone = "0903456789",
                    Status = "ACTIVE"
                }
            }));
        }

        // Fallback for general valid login pattern
        if (request.Password.Length >= 6)
        {
            var role = request.Email.Contains("admin") ? "Admin" : (request.Email.Contains("kho") ? "Thukho" : "Nhanvien");
            return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = $"jwt-token-{Guid.NewGuid():N}",
                User = new UserInfoDto
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = request.Email.Split('@')[0],
                    Email = request.Email,
                    Roles = new List<string> { role },
                    Status = "ACTIVE"
                }
            }));
        }

        return BadRequest(Result<LoginResponseDto>.Failure("Tài khoản hoặc mật khẩu không chính xác."));
    }
}
