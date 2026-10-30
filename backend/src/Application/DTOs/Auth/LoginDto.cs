namespace SeafoodWarehouseManagement.Application.DTOs.Auth;

public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? TenantName { get; set; }
    public int? TenantId { get; set; }
}

public class UserInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public string? Phone { get; set; }
    public string Status { get; set; } = "Active";
    public int? TenantId { get; set; }
    public string? TenantCode { get; set; }
    public string? TenantName { get; set; }
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public UserInfoDto User { get; set; } = new();
}

public class RefreshTokenRequestDto
{
    public string? RefreshToken { get; set; }
}
