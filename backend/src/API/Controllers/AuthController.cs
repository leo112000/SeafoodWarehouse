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
    private readonly ITokenBlacklistService _tokenBlacklistService;
    private readonly IPermissionCacheService _permissionCacheService;

    public AuthController(
        IApplicationDbContext context,
        IJwtTokenGenerator jwtTokenGenerator,
        ITokenBlacklistService tokenBlacklistService,
        IPermissionCacheService permissionCacheService)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _tokenBlacklistService = tokenBlacklistService;
        _permissionCacheService = permissionCacheService;
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
    [EnableRateLimiting("auth-limiter")]
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

        var (token, jti) = _jwtTokenGenerator.GenerateAccessTokenWithJti(adminUser, roles, tenant);
        var refreshTokenString = _jwtTokenGenerator.GenerateRefreshToken();
        var refreshTokenExpiryDays = _jwtTokenGenerator.GetRefreshTokenExpiryDays();
        var expiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

        var refreshTokenEntity = new RefreshToken
        {
            UserId = adminUser.Id,
            Token = refreshTokenString,
            JwtId = jti,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = GetClientIpAddress(),
            TenantId = tenant.Id
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        SetRefreshTokenCookie(refreshTokenString, expiresAt);

        var permissions = await _permissionCacheService.GetUserPermissionsAsync(adminUser.Id, tenant.Id, cancellationToken);

        return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
        {
            Token = token,
            RefreshToken = refreshTokenString,
            User = new UserInfoDto
            {
                Id = adminUser.Id.ToString(),
                Name = adminUser.FullName,
                Email = adminUser.Email,
                Roles = roles,
                Permissions = permissions,
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

            var (token, jti) = _jwtTokenGenerator.GenerateAccessTokenWithJti(user, roles, tenant);
            var refreshTokenString = _jwtTokenGenerator.GenerateRefreshToken();
            var refreshTokenExpiryDays = _jwtTokenGenerator.GetRefreshTokenExpiryDays();
            var expiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = refreshTokenString,
                JwtId = jti,
                ExpiresAt = expiresAt,
                CreatedAt = DateTime.UtcNow,
                CreatedByIp = GetClientIpAddress(),
                TenantId = user.TenantId
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync(cancellationToken);

            SetRefreshTokenCookie(refreshTokenString, expiresAt);

            var permissions = await _permissionCacheService.GetUserPermissionsAsync(user.Id, user.TenantId, cancellationToken);

            return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = token,
                RefreshToken = refreshTokenString,
                User = new UserInfoDto
                {
                    Id = user.Id.ToString(),
                    Name = user.FullName,
                    Email = user.Email,
                    Roles = roles,
                    Permissions = permissions,
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

    /// <summary>
    /// Cấp mới Access Token bằng Refresh Token (Chuẩn JWT Refresh Token Rotation)
    /// </summary>
    [HttpPost("refresh-token")]
    [EnableRateLimiting("auth-limiter")]
    public async Task<ActionResult<Result<LoginResponseDto>>> RefreshToken([FromBody] RefreshTokenRequestDto? request, CancellationToken cancellationToken = default)
    {
        var rawToken = request?.RefreshToken?.Trim() ?? Request.Cookies["refreshToken"]?.Trim();
        if (string.IsNullOrWhiteSpace(rawToken))
        {
            return Unauthorized(Result<LoginResponseDto>.Failure("Refresh Token không được để trống."));
        }

        var existingToken = await _context.RefreshTokens
            .IgnoreQueryFilters()
            .Include(rt => rt.User)
                .ThenInclude(u => u!.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(rt => rt.Token == rawToken && !rt.IsDeleted, cancellationToken);

        if (existingToken == null)
        {
            return Unauthorized(Result<LoginResponseDto>.Failure("Refresh Token không hợp lệ."));
        }

        // Phát hiện tái sử dụng Token đã bị thu hồi (Token Reuse / Theft Detection)
        if (existingToken.IsRevoked)
        {
            var compromisedTokens = await _context.RefreshTokens
                .IgnoreQueryFilters()
                .Where(rt => rt.UserId == existingToken.UserId && !rt.IsDeleted && rt.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var t in compromisedTokens)
            {
                t.RevokedAt = DateTime.UtcNow;
                t.RevokedByIp = GetClientIpAddress();
            }
            await _context.SaveChangesAsync(cancellationToken);

            Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/" });
            return Unauthorized(Result<LoginResponseDto>.Failure("Phát hiện Token đã bị thu hồi hoặc bị tái sử dụng trái phép. Vui lòng đăng nhập lại."));
        }

        if (existingToken.IsExpired)
        {
            Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/" });
            return Unauthorized(Result<LoginResponseDto>.Failure("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."));
        }

        var user = existingToken.User;
        if (user == null || user.IsDeleted || user.Status != "ACTIVE")
        {
            Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/" });
            return Unauthorized(Result<LoginResponseDto>.Failure("Tài khoản này hiện không khả dụng hoặc đã bị khóa."));
        }

        var roles = user.UserRoles != null && user.UserRoles.Count > 0
            ? user.UserRoles.Where(ur => ur.Role != null).Select(ur => ur.Role.Name).ToList()
            : new List<string> { user.Email.Contains("admin") ? "Admin" : (user.Email.Contains("kho") ? "Thukho" : "Nhanvien") };

        var tenant = user.TenantId.HasValue
            ? await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == user.TenantId.Value && !t.IsDeleted, cancellationToken)
            : null;

        // Sinh cặp Token mới (Rotate Refresh Token)
        var (newAccessToken, newJti) = _jwtTokenGenerator.GenerateAccessTokenWithJti(user, roles, tenant);
        var newRefreshTokenString = _jwtTokenGenerator.GenerateRefreshToken();
        var refreshTokenExpiryDays = _jwtTokenGenerator.GetRefreshTokenExpiryDays();
        var expiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays);

        // Đánh dấu thu hồi token cũ và thay thế bằng token mới
        existingToken.RevokedAt = DateTime.UtcNow;
        existingToken.RevokedByIp = GetClientIpAddress();
        existingToken.ReplacedByToken = newRefreshTokenString;

        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            Token = newRefreshTokenString,
            JwtId = newJti,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = GetClientIpAddress(),
            TenantId = user.TenantId
        };

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        SetRefreshTokenCookie(newRefreshTokenString, expiresAt);

        var permissions = await _permissionCacheService.GetUserPermissionsAsync(user.Id, user.TenantId, cancellationToken);

        return Ok(Result<LoginResponseDto>.Success(new LoginResponseDto
        {
            Token = newAccessToken,
            RefreshToken = newRefreshTokenString,
            User = new UserInfoDto
            {
                Id = user.Id.ToString(),
                Name = user.FullName,
                Email = user.Email,
                Roles = roles,
                Permissions = permissions,
                Phone = user.Phone,
                Status = user.Status,
                TenantId = user.TenantId,
                TenantCode = tenant?.Code,
                TenantName = tenant?.Name
            }
        }));
    }

    /// <summary>
    /// Thu hồi Access Token (vào Redis Token Blacklist) và Refresh Token khi đăng xuất an toàn (Revoke / Logout)
    /// </summary>
    [HttpPost("revoke")]
    [HttpPost("logout")]
    public async Task<ActionResult<Result<bool>>> RevokeToken([FromBody] RefreshTokenRequestDto? request, CancellationToken cancellationToken = default)
    {
        // 1. Đưa Access Token hiện tại vào Redis Token Blacklist dựa theo JTI
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var rawJwt = authHeader["Bearer ".Length..].Trim();
            try
            {
                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                if (handler.CanReadToken(rawJwt))
                {
                    var jwtToken = handler.ReadJwtToken(rawJwt);
                    var jti = jwtToken.Id;
                    var exp = jwtToken.ValidTo;
                    var remaining = exp - DateTime.UtcNow;

                    if (!string.IsNullOrWhiteSpace(jti) && remaining > TimeSpan.Zero)
                    {
                        await _tokenBlacklistService.BlacklistTokenAsync(jti, remaining, cancellationToken);
                    }
                }
            }
            catch
            {
                // Bỏ qua nếu token parse lỗi
            }
        }

        // 2. Thu hồi Refresh Token trong DB
        var rawToken = request?.RefreshToken?.Trim() ?? Request.Cookies["refreshToken"]?.Trim();
        if (!string.IsNullOrWhiteSpace(rawToken))
        {
            var token = await _context.RefreshTokens
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(rt => rt.Token == rawToken && !rt.IsDeleted, cancellationToken);

            if (token != null && token.RevokedAt == null)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedByIp = GetClientIpAddress();
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/" });
        return Ok(Result<bool>.Success(true));
    }

    private void SetRefreshTokenCookie(string refreshToken, DateTime expiresAt)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Expires = expiresAt,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        };

        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    private string GetClientIpAddress()
    {
        return Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
               ?? HttpContext.Connection.RemoteIpAddress?.ToString()
               ?? "unknown";
    }
}
