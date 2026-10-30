using SeafoodWarehouseManagement.Application.Common.Interfaces;

namespace SeafoodWarehouseManagement.Infrastructure.Services;

public class TokenBlacklistService : ITokenBlacklistService
{
    private readonly ICacheService _cacheService;

    public TokenBlacklistService(ICacheService cacheService)
    {
        _cacheService = cacheService;
    }

    private static string GetKey(string jti) => $"blacklist:{jti}";

    public async Task BlacklistTokenAsync(string jti, TimeSpan remainingLifetime, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(jti) || remainingLifetime <= TimeSpan.Zero)
        {
            return;
        }

        // Lưu trạng thái revoked vào Redis với thời gian hết hạn đúng bằng thời gian còn lại của Access Token
        await _cacheService.SetAsync(GetKey(jti), "revoked", remainingLifetime, cancellationToken);
    }

    public async Task<bool> IsBlacklistedAsync(string jti, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(jti))
        {
            return false;
        }

        var result = await _cacheService.GetAsync<string>(GetKey(jti), cancellationToken);
        return !string.IsNullOrEmpty(result);
    }
}
