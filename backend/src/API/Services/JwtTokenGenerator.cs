using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SeafoodWarehouseManagement.Domain.Entities;

using System.Security.Cryptography;

namespace SeafoodWarehouseManagement.API.Services;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user, List<string> roles, Tenant? tenant);
    (string AccessToken, string Jti) GenerateAccessTokenWithJti(User user, List<string> roles, Tenant? tenant);
    string GenerateRefreshToken();
    int GetRefreshTokenExpiryDays();
}

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user, List<string> roles, Tenant? tenant)
    {
        return GenerateAccessTokenWithJti(user, roles, tenant).AccessToken;
    }

    public (string AccessToken, string Jti) GenerateAccessTokenWithJti(User user, List<string> roles, Tenant? tenant)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? "SeafoodWarehouseSecureJwtSigningSecretKey_2026_UltraProtected_Min256Bits";
        var issuer = _configuration["Jwt:Issuer"] ?? "SeafoodWarehouseAPI";
        var audience = _configuration["Jwt:Audience"] ?? "SeafoodWarehouseClient";

        // Mặc định Access Token hết hạn sau 60 phút (chuẩn SRS Enterprise), hoặc cấu hình theo ExpiryMinutes/ExpiryDays
        DateTime expiresAt;
        if (int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var minutes) && minutes > 0)
        {
            expiresAt = DateTime.UtcNow.AddMinutes(minutes);
        }
        else if (int.TryParse(_configuration["Jwt:ExpiryDays"], out var days) && days > 0)
        {
            expiresAt = DateTime.UtcNow.AddDays(days);
        }
        else
        {
            expiresAt = DateTime.UtcNow.AddMinutes(60);
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jti = Guid.NewGuid().ToString("N");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, jti),
        };

        if (user.TenantId.HasValue)
        {
            claims.Add(new Claim("TenantId", user.TenantId.Value.ToString()));
            claims.Add(new Claim("tenant_id", user.TenantId.Value.ToString()));
        }

        if (tenant != null)
        {
            claims.Add(new Claim("TenantCode", tenant.Code));
            claims.Add(new Claim("TenantName", tenant.Name));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, jti);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public int GetRefreshTokenExpiryDays()
    {
        return int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var days) && days > 0 ? days : 7;
    }
}

