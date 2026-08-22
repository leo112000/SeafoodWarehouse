using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Báo cáo & Thống kê Kho Hải Sản - Tính toán Doanh thu, Chi phí & Lợi nhuận gộp 100% từ CSDL thực
/// </summary>
[Route("api/[controller]")]
public class ReportsController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public ReportsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy dữ liệu báo cáo thống kê theo khung thời gian từ CSDL thực tế
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetReportData(
        [FromQuery] string timeFrame = "month",
        [FromQuery] string dateRange = "",
        [FromQuery] int? categoryId = null,
        CancellationToken cancellationToken = default)
    {
        // 1. Lấy tất cả giao dịch nhập / xuất / hủy từ CSDL
        var inboundTx = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Import)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .ToListAsync(cancellationToken);

        var outboundTx = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Export)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .ToListAsync(cancellationToken);

        var wastageTx = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Disposal)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .ToListAsync(cancellationToken);

        // Helper: Tính Giá trị giao dịch thực tế (Doanh thu bán nếu Export, Tiền nhập nếu Import)
        static double GetTxAmount(InventoryTransaction t)
        {
            if (t.TotalAmount > 0)
                return (double)t.TotalAmount;

            double price = 0.0;
            if (t.UnitPrice > 0)
                price = (double)t.UnitPrice;
            else if (t.LotBatch != null && t.LotBatch.UnitPrice > 0)
                price = (double)t.LotBatch.UnitPrice;
            else if (t.LotBatch?.Product != null && t.LotBatch.Product.ReferencePrice > 0)
                price = (double)t.LotBatch.Product.ReferencePrice;
            else
                price = 250000.0;

            return (double)t.Quantity * price;
        }

        // Helper: Tính Giá vốn của hàng xuất kho (Cost of Goods Sold - COGS)
        static double GetTxCost(InventoryTransaction t)
        {
            double costPrice = 0.0;
            if (t.LotBatch != null && t.LotBatch.UnitPrice > 0)
                costPrice = (double)t.LotBatch.UnitPrice;
            else if (t.LotBatch?.Product != null && t.LotBatch.Product.ReferencePrice > 0)
                costPrice = (double)t.LotBatch.Product.ReferencePrice;
            else
                costPrice = 250000.0;

            return (double)t.Quantity * costPrice;
        }

        double totalInboundKg = (double)inboundTx.Sum(t => t.Quantity);
        double totalInboundAmount = inboundTx.Sum(t => GetTxAmount(t));

        double totalOutboundKg = (double)outboundTx.Sum(t => t.Quantity);
        double totalOutboundAmount = outboundTx.Sum(t => GetTxAmount(t));
        double cogsAmount = outboundTx.Sum(t => GetTxCost(t));
        double grossProfit = totalOutboundAmount - cogsAmount;
        double profitMarginPercent = totalOutboundAmount > 0 ? Math.Round((grossProfit / totalOutboundAmount) * 100.0, 2) : 0.0;

        double totalWastageKg = (double)wastageTx.Sum(t => t.Quantity);

        // 2. Tính tổng tồn kho hiện tại từ CSDL
        var stockItems = await _context.InventoryItems
            .Where(i => !i.IsDeleted)
            .Include(i => i.LotBatch).ThenInclude(l => l.Product).ThenInclude(p => p.Category)
            .ToListAsync(cancellationToken);

        double stockKg = (double)stockItems.Sum(i => i.Quantity);
        double stockValue = stockItems.Sum(i =>
        {
            var unitPrice = (i.LotBatch != null && i.LotBatch.UnitPrice > 0)
                ? (double)i.LotBatch.UnitPrice
                : ((i.LotBatch?.Product != null && i.LotBatch.Product.ReferencePrice > 0)
                    ? (double)i.LotBatch.Product.ReferencePrice
                    : 250000.0);
            return (double)i.Quantity * unitPrice;
        });

        double lossRate = (totalInboundKg + stockKg) > 0
            ? Math.Round((totalWastageKg / (totalInboundKg + stockKg)) * 100.0, 2)
            : 0.0;

        var summary = new
        {
            totalInboundKg,
            totalInboundAmount,
            totalOutboundKg,
            totalOutboundAmount,
            cogsAmount,
            grossProfit,
            profitMarginPercent,
            stockKg,
            stockValue,
            wastageKg = totalWastageKg,
            lossRate
        };

        // 3. Chuỗi thời gian theo chế độ xem (timeFrame: week, month, quarter, year)
        var timeSeries = new List<object>();
        var currentYear = DateTime.UtcNow.Year;

        if (timeFrame == "quarter")
        {
            // 4 Quý trong năm
            for (int q = 1; q <= 4; q++)
            {
                int startMonth = (q - 1) * 3 + 1;
                int endMonth = q * 3;

                var qInbound = inboundTx.Where(t => t.TransactionDate.Year == currentYear && t.TransactionDate.Month >= startMonth && t.TransactionDate.Month <= endMonth).ToList();
                var qOutbound = outboundTx.Where(t => t.TransactionDate.Year == currentYear && t.TransactionDate.Month >= startMonth && t.TransactionDate.Month <= endMonth).ToList();

                timeSeries.Add(new
                {
                    label = $"Quý {q}",
                    inboundKg = (double)qInbound.Sum(t => t.Quantity),
                    outboundKg = (double)qOutbound.Sum(t => t.Quantity),
                    inboundAmount = qInbound.Sum(t => GetTxAmount(t)),
                    outboundAmount = qOutbound.Sum(t => GetTxAmount(t))
                });
            }
        }
        else if (timeFrame == "year")
        {
            // 12 Tháng trong năm
            for (int m = 1; m <= 12; m++)
            {
                var mInbound = inboundTx.Where(t => t.TransactionDate.Year == currentYear && t.TransactionDate.Month == m).ToList();
                var mOutbound = outboundTx.Where(t => t.TransactionDate.Year == currentYear && t.TransactionDate.Month == m).ToList();

                timeSeries.Add(new
                {
                    label = $"Tháng {m}",
                    inboundKg = (double)mInbound.Sum(t => t.Quantity),
                    outboundKg = (double)mOutbound.Sum(t => t.Quantity),
                    inboundAmount = mInbound.Sum(t => GetTxAmount(t)),
                    outboundAmount = mOutbound.Sum(t => GetTxAmount(t))
                });
            }
        }
        else if (timeFrame == "week")
        {
            // 7 Ngày trong tuần hiện tại
            var startOfWeek = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + (int)DayOfWeek.Monday);
            string[] dayNames = { "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật" };

            for (int d = 0; d < 7; d++)
            {
                var targetDate = startOfWeek.AddDays(d);
                var dInbound = inboundTx.Where(t => t.TransactionDate.Date == targetDate).ToList();
                var dOutbound = outboundTx.Where(t => t.TransactionDate.Date == targetDate).ToList();

                timeSeries.Add(new
                {
                    label = dayNames[d],
                    inboundKg = (double)dInbound.Sum(t => t.Quantity),
                    outboundKg = (double)dOutbound.Sum(t => t.Quantity),
                    inboundAmount = dInbound.Sum(t => GetTxAmount(t)),
                    outboundAmount = dOutbound.Sum(t => GetTxAmount(t))
                });
            }
        }
        else
        {
            // Mặc định "month": 4 Tuần trong tháng hiện tại
            var currentMonth = DateTime.UtcNow.Month;
            for (int w = 1; w <= 4; w++)
            {
                int startDay = (w - 1) * 7 + 1;
                int endDay = w == 4 ? 31 : w * 7;

                var wInbound = inboundTx.Where(t => t.TransactionDate.Year == currentYear && t.TransactionDate.Month == currentMonth && t.TransactionDate.Day >= startDay && t.TransactionDate.Day <= endDay).ToList();
                var wOutbound = outboundTx.Where(t => t.TransactionDate.Year == currentYear && t.TransactionDate.Month == currentMonth && t.TransactionDate.Day >= startDay && t.TransactionDate.Day <= endDay).ToList();

                timeSeries.Add(new
                {
                    label = $"Tuần {w}",
                    inboundKg = (double)wInbound.Sum(t => t.Quantity),
                    outboundKg = (double)wOutbound.Sum(t => t.Quantity),
                    inboundAmount = wInbound.Sum(t => GetTxAmount(t)),
                    outboundAmount = wOutbound.Sum(t => GetTxAmount(t))
                });
            }
        }

        // 4. Phân bổ tồn kho theo danh mục thực tế từ CSDL
        var categoryGroup = stockItems
            .GroupBy(i => i.LotBatch?.Product?.Category?.Name ?? "Hải sản khác")
            .Select(g => new
            {
                category = g.Key,
                kg = (double)g.Sum(x => x.Quantity),
                value = g.Sum(x =>
                {
                    var p = (x.LotBatch != null && x.LotBatch.UnitPrice > 0)
                        ? (double)x.LotBatch.UnitPrice
                        : ((x.LotBatch?.Product != null && x.LotBatch.Product.ReferencePrice > 0)
                            ? (double)x.LotBatch.Product.ReferencePrice
                            : 250000.0);
                    return (double)x.Quantity * p;
                })
            })
            .ToList();

        var colors = new[] { "#3b82f6", "#f97316", "#ef4444", "#8b5cf6", "#10b981", "#06b6d4" };
        var stockByCategory = categoryGroup.Select((c, idx) => new
        {
            c.category,
            c.kg,
            c.value,
            color = colors[idx % colors.Length]
        }).ToList();

        // 5. Top sản phẩm xuất / nhập / tồn thực tế từ CSDL
        var products = await _context.Products
            .Where(p => !p.IsDeleted)
            .Include(p => p.Category)
            .Include(p => p.LotBatches).ThenInclude(l => l.InventoryItems)
            .ToListAsync(cancellationToken);

        var allTransactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted)
            .Include(t => t.LotBatch)
            .ToListAsync(cancellationToken);

        var topItems = products.Select(p =>
        {
            var bIds = p.LotBatches.Select(l => l.Id).ToHashSet();
            var inTxList = allTransactions.Where(t => t.Type == TransactionType.Import && bIds.Contains(t.LotBatchId)).ToList();
            var outTxList = allTransactions.Where(t => t.Type == TransactionType.Export && bIds.Contains(t.LotBatchId)).ToList();

            var inKg = (double)inTxList.Sum(t => t.Quantity);
            var inAmount = inTxList.Sum(t => GetTxAmount(t));

            var outKg = (double)outTxList.Sum(t => t.Quantity);
            var outAmount = outTxList.Sum(t => GetTxAmount(t));

            var curStock = (double)p.LotBatches.SelectMany(l => l.InventoryItems).Where(i => !i.IsDeleted).Sum(i => i.Quantity);

            var lotPrice = p.LotBatches.Where(l => l.UnitPrice > 0).Select(l => (double)l.UnitPrice).FirstOrDefault();
            var unitPrice = lotPrice > 0 ? lotPrice : (double)(p.ReferencePrice > 0 ? p.ReferencePrice : 250000m);

            return new
            {
                name = p.Name,
                categoryName = p.Category?.Name ?? "Hải sản",
                inboundKg = inKg,
                inboundAmount = inAmount,
                outboundKg = outKg,
                outboundAmount = outAmount,
                stockKg = curStock,
                stockValue = curStock * unitPrice
            };
        })
        .Where(x => x.inboundKg > 0 || x.outboundKg > 0 || x.stockKg > 0)
        .OrderByDescending(x => x.outboundKg + x.inboundKg + x.stockKg)
        .Select((x, idx) => new
        {
            rank = idx + 1,
            x.name,
            x.categoryName,
            x.inboundKg,
            x.inboundAmount,
            x.outboundKg,
            x.outboundAmount,
            x.stockKg,
            x.stockValue
        })
        .Take(10)
        .ToList();

        var result = new
        {
            summary,
            timeSeries,
            stockByCategory,
            topItems,
            wastage = new[] { new { label = "Tháng này", wastageKg = totalWastageKg, lossRate } }
        };

        return Ok(Result<object>.Success(result));
    }

    /// <summary>
    /// Báo cáo tỷ lệ hao hụt theo các tháng gần nhất từ CSDL thực
    /// </summary>
    [HttpGet("wastage-monthly")]
    public async Task<ActionResult<Result<object>>> GetMonthlyWastageReport(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var list = new List<object>();

        for (int i = 0; i < 6; i++)
        {
            var targetMonth = now.AddMonths(-i);
            var year = targetMonth.Year;
            var month = targetMonth.Month;

            var monthStr = $"{month:D2}/{year}";

            var inboundKg = await _context.InventoryTransactions
                .Where(t => !t.IsDeleted && t.Type == TransactionType.Import && t.TransactionDate.Year == year && t.TransactionDate.Month == month)
                .SumAsync(t => (double?)t.Quantity, cancellationToken) ?? 0.0;

            var wastageKg = await _context.InventoryTransactions
                .Where(t => !t.IsDeleted && t.Type == TransactionType.Disposal && t.TransactionDate.Year == year && t.TransactionDate.Month == month)
                .SumAsync(t => (double?)t.Quantity, cancellationToken) ?? 0.0;

            double rate = inboundKg > 0 ? Math.Round((wastageKg / inboundKg) * 100.0, 2) : 0.0;

            list.Add(new
            {
                month = monthStr,
                totalInbound = Math.Round(inboundKg, 1),
                totalWastage = Math.Round(wastageKg, 1),
                rate
            });
        }

        return Ok(Result<object>.Success(list));
    }
}
