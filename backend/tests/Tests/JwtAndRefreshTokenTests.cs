using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using SeafoodWarehouseManagement.API.Services;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Tests;

public class JwtAndRefreshTokenTests
{
    private readonly IConfiguration _configuration;

    public JwtAndRefreshTokenTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Jwt:SecretKey", "SuperSecretKeyForTestingJwtAuthentication_MustBeAtLeast256BitsLong_2026" },
            { "Jwt:Issuer", "TestIssuer" },
            { "Jwt:Audience", "TestAudience" },
            { "Jwt:ExpiryMinutes", "60" },
            { "Jwt:RefreshTokenExpiryDays", "7" }
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public void RefreshTokenEntity_StatusChecks_WorkCorrectly()
    {
        // Active token
        var activeToken = new RefreshToken
        {
            Token = "active_token_123",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = null,
            IsDeleted = false
        };

        Assert.False(activeToken.IsExpired);
        Assert.False(activeToken.IsRevoked);
        Assert.True(activeToken.IsActive);

        // Expired token
        var expiredToken = new RefreshToken
        {
            Token = "expired_token_123",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5),
            RevokedAt = null,
            IsDeleted = false
        };

        Assert.True(expiredToken.IsExpired);
        Assert.False(expiredToken.IsActive);

        // Revoked token
        var revokedToken = new RefreshToken
        {
            Token = "revoked_token_123",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddMinutes(-1),
            IsDeleted = false
        };

        Assert.True(revokedToken.IsRevoked);
        Assert.False(revokedToken.IsActive);
    }

    [Fact]
    public void GenerateAccessTokenWithJti_ProducesValidJwt_WithClaimsAndExpiry()
    {
        var generator = new JwtTokenGenerator(_configuration);
        var user = new User
        {
            Id = 42,
            FullName = "Tran Van Test",
            Email = "test@seafood.vn",
            TenantId = 10
        };
        var roles = new List<string> { "Admin", "Thukho" };
        var tenant = new Tenant
        {
            Id = 10,
            Code = "TESTTENANT",
            Name = "Chi Nhanh Test"
        };

        var (accessToken, jti) = generator.GenerateAccessTokenWithJti(user, roles, tenant);

        Assert.NotNull(accessToken);
        Assert.NotEmpty(accessToken);
        Assert.NotNull(jti);
        Assert.NotEmpty(jti);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(accessToken);

        Assert.Equal("TestIssuer", jwt.Issuer);
        Assert.Contains(jwt.Audiences, a => a == "TestAudience");
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == "42");
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Jti && c.Value == jti);
        Assert.Contains(jwt.Claims, c => c.Type == "TenantId" && c.Value == "10");
        Assert.Contains(jwt.Claims, c => c.Type == "TenantCode" && c.Value == "TESTTENANT");
        Assert.Contains(jwt.Claims, c => (c.Type == "role" || c.Type.EndsWith("/role")) && c.Value == "Admin");

        // Hạn sử dụng phải trong khoảng 60 phút
        var expectedExpiry = DateTime.UtcNow.AddMinutes(60);
        var diff = Math.Abs((jwt.ValidTo - expectedExpiry).TotalMinutes);
        Assert.True(diff < 2, $"Expiry difference should be less than 2 minutes, got {diff}");
    }

    [Fact]
    public void GenerateRefreshToken_GeneratesCryptographicallyStrongToken()
    {
        var generator = new JwtTokenGenerator(_configuration);
        var token1 = generator.GenerateRefreshToken();
        var token2 = generator.GenerateRefreshToken();

        Assert.NotNull(token1);
        Assert.NotNull(token2);
        Assert.NotEqual(token1, token2);

        // Chuỗi base64 của 64 bytes phải có độ dài 88 ký tự
        Assert.True(token1.Length >= 80);
    }
}
