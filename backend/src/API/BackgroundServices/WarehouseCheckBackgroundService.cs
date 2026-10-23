using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SeafoodWarehouseManagement.Application.Common.Interfaces;

namespace SeafoodWarehouseManagement.API.BackgroundServices;

/// <summary>
/// Background Service mẫu: Chạy tác vụ ngầm định kỳ trong hệ thống.
/// Thường dùng cho: Quét lô hàng sắp hết hạn, tính toán cảnh báo tồn kho, dọn dẹp log, gửi email...
/// </summary>
public class WarehouseCheckBackgroundService : BackgroundService
{
    private readonly ILogger<WarehouseCheckBackgroundService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    // Chu kỳ chạy ngầm (ví dụ: mỗi 60 giây chạy 1 lần để test)
    private readonly TimeSpan _period = TimeSpan.FromSeconds(60);

    public WarehouseCheckBackgroundService(
        ILogger<WarehouseCheckBackgroundService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// Hàm chính thực thi khi ứng dụng Backend bắt đầu chạy
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(">>> [BackgroundService] WarehouseCheckBackgroundService đã được KHỞI ĐỘNG thành công.");

        // Đợi 5 giây sau khi ứng dụng start để database hoàn tất khởi tạo/seed
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation(">>> [BackgroundService] Bắt đầu chu kỳ quét kiểm tra kho định kỳ lúc {Time}...", DateTimeOffset.Now);

                // QUAN TRỌNG NHẤT TRONG .NET BACKGROUND SERVICE:
                // BackgroundService là Singleton, trong khi DbContext / Repositories là Scoped.
                // Do đó, BẮT BUỘC phải tạo Scope tạm thời qua IServiceScopeFactory để gọi DbContext/Service.
                using (var scope = _scopeFactory.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                    // Ví dụ: Đếm số lượng sản phẩm đang có trong hệ thống để demo tác vụ ngầm
                    var totalProducts = await dbContext.Products.CountAsync(stoppingToken);

                    _logger.LogInformation(">>> [BackgroundService] Hoàn tất kiểm tra: Hệ thống đang có {Count} sản phẩm. Đợi chu kỳ tiếp theo...", totalProducts);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, ">>> [BackgroundService] Xảy ra lỗi trong quá trình quét ngầm: {Message}", ex.Message);
            }

            // Chờ đến chu kỳ tiếp theo hoặc dừng lại nếu ứng dụng shutdown
            await Task.Delay(_period, stoppingToken);
        }

        _logger.LogInformation(">>> [BackgroundService] WarehouseCheckBackgroundService đang DỪNG LẠI do ứng dụng shutdown.");
    }
}
