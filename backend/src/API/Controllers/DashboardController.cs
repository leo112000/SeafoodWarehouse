using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Bảng điều khiển thống kê kho hải sản - truy vấn CSDL thực tế
/// </summary>
[Route("api/[controller]")]
public class DashboardController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public DashboardController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy dữ liệu tổng quan Bảng điều khiển từ CSDL thực
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetDashboardSummary(CancellationToken cancellationToken = default)
    {
        var setting = await _context.Settings
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        int expiringDays = setting?.ExpiringAlertDays > 0 ? setting.ExpiringAlertDays : 15;
        double defaultSeafoodPrice = (double)(setting?.DefaultSeafoodPrice ?? 250000);

        var today = DateTime.UtcNow.Date;
        var todayEnd = today.AddDays(1);
        var inAlertDays = today.AddDays(expiringDays);
        var thirtyDaysAgo = today.AddDays(-30);

        // 1. Tổng tồn kho & tổng giá trị tồn kho theo đơn giá tham chiếu sản phẩm
        var inventoryItems = await _context.InventoryItems
            .Where(i => !i.IsDeleted)
            .Include(i => i.LotBatch)
            .ThenInclude(l => l.Product)
            .ToListAsync(cancellationToken);

        double totalStockKg = inventoryItems.Sum(i => (double)i.Quantity);
        double totalStockValue = inventoryItems.Sum(i =>
        {
            var refPrice = (double)(i.LotBatch?.Product?.ReferencePrice ?? 0);
            var unitPrice = refPrice > 0 ? refPrice : defaultSeafoodPrice;
            return (double)i.Quantity * unitPrice;
        });

        // 2. Nhập / Xuất kho hôm nay
        var todayInboundList = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Import && t.TransactionDate >= today && t.TransactionDate < todayEnd)
            .ToListAsync(cancellationToken);

        var todayOutboundList = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Export && t.TransactionDate >= today && t.TransactionDate < todayEnd)
            .ToListAsync(cancellationToken);

        double todayInboundKg = (double)todayInboundList.Sum(t => t.Quantity);
        int todayInboundCount = todayInboundList.Select(t => t.ReferenceNumber).Distinct().Count();

        double todayOutboundKg = (double)todayOutboundList.Sum(t => t.Quantity);
        int todayOutboundCount = todayOutboundList.Select(t => t.ReferenceNumber).Distinct().Count();

        // 3. Cảnh báo lô hạn sử dụng (động theo Cài đặt) & sản phẩm tồn kho dưới định mức tối thiểu
        var expiringBatchesCount = await _context.LotBatches
            .Where(b => !b.IsDeleted && b.CurrentQuantity > 0 && b.ExpirationDate <= inAlertDays)
            .CountAsync(cancellationToken);

        var products = await _context.Products
            .Where(p => !p.IsDeleted && p.Status == "ACTIVE" && p.MinimumStock > 0)
            .Include(p => p.LotBatches)
            .ToListAsync(cancellationToken);

        int lowStockCount = products.Count(p =>
        {
            var currentStock = p.LotBatches
                .Where(l => !l.IsDeleted && l.CurrentQuantity > 0)
                .Sum(l => (double)l.CurrentQuantity);
            return currentStock < (double)p.MinimumStock;
        });

        // Cảnh báo kho lạnh có nguy cơ/cần chú ý
        var deviatedFreezersCount = await _context.Warehouses
            .Where(w => !w.IsDeleted && w.IsActive && w.Type == StorageType.FrozenStorage)
            .CountAsync(cancellationToken);

        // 4. Tỷ lệ hao hụt / hủy hàng trong 30 ngày qua
        var monthlyDisposalKg = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Disposal && t.TransactionDate >= thirtyDaysAgo)
            .SumAsync(t => (double?)t.Quantity, cancellationToken) ?? 0.0;

        var monthlyInboundKg = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Import && t.TransactionDate >= thirtyDaysAgo)
            .SumAsync(t => (double?)t.Quantity, cancellationToken) ?? 0.0;

        double monthlyLossRate = (monthlyInboundKg + totalStockKg) > 0
            ? Math.Round((monthlyDisposalKg / (monthlyInboundKg + totalStockKg)) * 100.0, 2)
            : 0.0;

        // 5. Luồng nhập xuất 7 ngày gần nhất
        var dailyFlow = new List<object>();
        for (int d = 6; d >= 0; d--)
        {
            var dayStart = today.AddDays(-d);
            var dayNext = dayStart.AddDays(1);

            var inKg = await _context.InventoryTransactions
                .Where(t => !t.IsDeleted && t.Type == TransactionType.Import && t.TransactionDate >= dayStart && t.TransactionDate < dayNext)
                .SumAsync(t => (double?)t.Quantity, cancellationToken) ?? 0.0;

            var outKg = await _context.InventoryTransactions
                .Where(t => !t.IsDeleted && t.Type == TransactionType.Export && t.TransactionDate >= dayStart && t.TransactionDate < dayNext)
                .SumAsync(t => (double?)t.Quantity, cancellationToken) ?? 0.0;

            dailyFlow.Add(new
            {
                date = dayStart.ToString("dd/MM"),
                inboundKg = inKg,
                outboundKg = outKg
            });
        }

        // 6. Thống kê tồn kho theo danh mục CSDL
        var categoryStockData = await _context.InventoryItems
            .Where(i => !i.IsDeleted)
            .Include(i => i.LotBatch).ThenInclude(l => l.Product).ThenInclude(p => p.Category)
            .GroupBy(i => i.LotBatch.Product.Category.Name)
            .Select(g => new
            {
                name = g.Key,
                value = g.Sum(x => (double)x.Quantity)
            })
            .ToListAsync(cancellationToken);

        var colors = new[] { "#3b82f6", "#f97316", "#ef4444", "#8b5cf6", "#10b981" };
        var categoryStock = categoryStockData.Select((c, idx) => new
        {
            c.name,
            c.value,
            color = colors[idx % colors.Length]
        }).ToList();

        // 7. Giao dịch gần nhất
        var recentTxData = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .OrderByDescending(t => t.TransactionDate)
            .Take(10)
            .ToListAsync(cancellationToken);

        var recentTransactions = recentTxData.Select(t =>
        {
            var refPrice = (double)(t.LotBatch?.Product?.ReferencePrice ?? 0);
            var unitPrice = refPrice > 0 ? refPrice : 200000.0;
            return new
            {
                id = t.ReferenceNumber,
                type = t.Type == TransactionType.Import ? "INBOUND" : "OUTBOUND",
                time = t.TransactionDate.ToString("HH:mm"),
                partnerName = string.IsNullOrWhiteSpace(t.Note) ? (t.Type == TransactionType.Import ? "Nhà cung cấp" : "Khách hàng") : t.Note,
                weightKg = (double)t.Quantity,
                amount = (double)t.Quantity * unitPrice
            };
        }).ToList();

        var response = new
        {
            alerts = new
            {
                expiringBatchesCount,
                deviatedFreezersCount,
                lowStockProductsCount = lowStockCount
            },
            kpis = new
            {
                totalStockKg = new { value = totalStockKg },
                totalStockValue = new { value = totalStockValue },
                todayInboundKg = new { value = todayInboundKg },
                todayInboundReceipts = new { value = todayInboundCount },
                todayOutboundKg = new { value = todayOutboundKg },
                todayOutboundTransactions = new { value = todayOutboundCount },
                monthlyLossRate = new { value = monthlyLossRate }
            },
            dailyFlow,
            categoryStock,
            recentTransactions
        };

        return Ok(Result<object>.Success(response));
    }
}
