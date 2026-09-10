using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using SeafoodWarehouseManagement.Application.Common.Interfaces;

namespace SeafoodWarehouseManagement.Infrastructure.Services;

public class DistributedCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<DistributedCacheService> _logger;
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _prefixKeyMap = new();

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public DistributedCacheService(IDistributedCache cache, ILogger<DistributedCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var data = await _cache.GetStringAsync(key, cancellationToken);
            if (string.IsNullOrWhiteSpace(data))
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(data, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache get error for key: {Key}. Fallback to source.", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(10)
            };

            var json = JsonSerializer.Serialize(value, _jsonOptions);
            await _cache.SetStringAsync(key, json, options, cancellationToken);

            TrackKeyPrefix(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache set error for key: {Key}", key);
        }
    }

    public async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        var cached = await GetAsync<T>(key, cancellationToken);
        if (cached != null)
        {
            return cached;
        }

        var result = await factory(cancellationToken);
        if (result != null)
        {
            await SetAsync(key, result, expiration, cancellationToken);
        }

        return result;
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await _cache.RemoveAsync(key, cancellationToken);
            UntrackKey(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache remove error for key: {Key}", key);
        }
    }

    public async Task RemoveByPrefixAsync(string prefixKey, CancellationToken cancellationToken = default)
    {
        try
        {
            // Find all matching prefixes
            var matchingPrefixes = _prefixKeyMap.Keys.Where(k => k.StartsWith(prefixKey, StringComparison.OrdinalIgnoreCase)).ToList();

            foreach (var p in matchingPrefixes)
            {
                if (_prefixKeyMap.TryRemove(p, out var keys))
                {
                    foreach (var key in keys.Keys)
                    {
                        try
                        {
                            await _cache.RemoveAsync(key, cancellationToken);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to remove key {Key} by prefix {Prefix}", key, prefixKey);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache RemoveByPrefix error for prefix: {Prefix}", prefixKey);
        }
    }

    private void TrackKeyPrefix(string key)
    {
        var colonIndex = key.IndexOf(':');
        var prefix = colonIndex > 0 ? key[..(colonIndex + 1)] : key;

        var keys = _prefixKeyMap.GetOrAdd(prefix, _ => new ConcurrentDictionary<string, byte>());
        keys.TryAdd(key, 0);
    }

    private void UntrackKey(string key)
    {
        var colonIndex = key.IndexOf(':');
        var prefix = colonIndex > 0 ? key[..(colonIndex + 1)] : key;

        if (_prefixKeyMap.TryGetValue(prefix, out var keys))
        {
            keys.TryRemove(key, out _);
        }
    }
}
