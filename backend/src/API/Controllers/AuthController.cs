using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.API.Services;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Auth;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Xác thực và Phân quyền người dùng (Security Hardened)
/// </summary>
[Route("api/[controller]")]
public class AuthController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthController(IApplicationDbContext context, IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
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
    /// Đăng nhập trực tiếp vào tài khoản Admin của một Tenant (Impersonate)
    /// </summary>
    [HttpPost("impersonate-tenant/{tenantId:int}")]
    public async Task<ActionResult<Result<LoginResponseDto>>> ImpersonateTenant(int tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
        {
            return NotFound(Result<LoginResponseDto>.Failure("Không tìm thấy doanh nghiệp (Tenant)."));
        }

        if (!tenant.IsActive)
        {
            return BadRequest(Result<LoginResponseDto>.Failure("Doanh nghiệp này hiện đang bị tạm khóa."));
        }

        var adminUser = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted && u.UserRoles.Any(ur => ur.Role.Name == "Admin"), cancellationToken);

        if (adminUser == null)
        {
            adminUser = await _context.Users
                .IgnoreQueryFilters()
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);
        }

        if (adminUser == null)
        {
            var adminRole = await _context.Roles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Name == "Admin" && !r.IsDeleted, cancellationToken);

            adminUser = new User
            {
                FullName = $"Admin ({tenant.Name})",
                Email = !string.IsNullOrWhiteSpace(tenant.Email) ? tenant.Email : $"admin@{tenant.Code.ToLower()}.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
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
            : new List<string> { "Admin" };

        var token = _jwtTokenGenerator.GenerateToken(adminUser, roles, tenant);

        return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
        {
            Token = token,
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
    /// Đăng nhập tài khoản bảo mật kèm Rate Limiting
    /// </summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth-limiter")]
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

        User? user = null;
        if (request.TenantId.HasValue && request.TenantId.Value > 0)
        {
            // Người dùng CÓ nhập Tenant: Chỉ tìm tài khoản thuộc đúng Tenant này (hoặc tài khoản Host Admin)
            user = await userQuery.FirstOrDefaultAsync(u => u.TenantId == request.TenantId.Value, cancellationToken)
                ?? await userQuery.FirstOrDefaultAsync(u => u.TenantId == null, cancellationToken);
        }
        else
        {
            // Người dùng KHÔNG nhập Tenant (để trống ô Tenant): Chỉ tìm tài khoản cấp Host (TenantId == null)
            user = await userQuery.FirstOrDefaultAsync(u => u.TenantId == null, cancellationToken);
        }

        bool isPasswordValid = false;
        if (user != null)
        {
            if (user.PasswordHash.StartsWith("$2") && BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                isPasswordValid = true;
            }
            else if (!string.IsNullOrEmpty(user.PasswordHash) && user.PasswordHash == request.Password)
            {
                // Tự động nâng cấp mã hóa sang BCrypt cho các tài khoản cũ chưa băm mật khẩu
                isPasswordValid = true;
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        if (user != null && isPasswordValid)
        {
            if (user.Status != "ACTIVE")
            {
                return BadRequest(Result<LoginResponseDto>.Failure("Tài khoản này hiện đang bị khóa."));
            }

            var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
            if (roles.Count == 0)
            {
                roles.Add(request.Email.Contains("admin") ? "Admin" : (request.Email.Contains("kho") ? "Thukho" : "Nhanvien"));
            }

            var tenant = user.TenantId.HasValue
                ? await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == user.TenantId.Value && !t.IsDeleted, cancellationToken)
                : null;

            var token = _jwtTokenGenerator.GenerateToken(user, roles, tenant);

            return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = token,
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

        return BadRequest(Result<LoginResponseDto>.Failure("Tài khoản hoặc mật khẩu không chính xác."));
    }
}
