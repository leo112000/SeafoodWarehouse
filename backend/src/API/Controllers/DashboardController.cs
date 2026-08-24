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

        var todayReceipts = await _context.OutboundReceipts
            .Where(r => !r.IsDeleted && r.TransactionDate >= today && r.TransactionDate < todayEnd)
            .ToListAsync(cancellationToken);

        double todayInboundKg = (double)todayInboundList.Sum(t => t.Quantity);
        int todayInboundCount = todayInboundList.Select(t => t.ReferenceNumber).Distinct().Count();
        double todayInboundValue = todayInboundList.Sum(t =>
        {
            if (t.TotalAmount > 0) return (double)t.TotalAmount;
            var price = t.UnitPrice > 0 ? (double)t.UnitPrice : (t.LotBatch != null && t.LotBatch.UnitPrice > 0 ? (double)t.LotBatch.UnitPrice : defaultSeafoodPrice);
            return (double)t.Quantity * price;
        });

        double todayOutboundKg = (double)todayOutboundList.Sum(t => t.Quantity);
        int todayOutboundCount = todayReceipts.Count > 0 ? todayReceipts.Count : todayOutboundList.Select(t => t.ReferenceNumber).Distinct().Count();
        double todayOutboundValue = todayReceipts.Count > 0 
            ? (double)todayReceipts.Sum(r => r.TotalAmount)
            : (double)todayOutboundList.Sum(t => t.TotalAmount > 0 ? t.TotalAmount : (t.Quantity * 250000m));

        // 3. Cảnh báo lô hạn sử dụng (động theo Cài đặt) & sản phẩm tồn kho dưới định mức tối thiểu
        var expiringBatchesCount = await _context.LotBatches
            .Where(b => !b.IsDeleted && b.CurrentQuantity > 0 && b.ExpirationDate >= today && b.ExpirationDate <= inAlertDays)
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

        // 5. Luồng nhập xuất 7 ngày gần nhất (Khối lượng Kg & Số tiền VNĐ)
        var dailyFlow = new List<object>();
        for (int d = 6; d >= 0; d--)
        {
            var dayStart = today.AddDays(-d);
            var dayNext = dayStart.AddDays(1);

            var inTxs = await _context.InventoryTransactions
                .Where(t => !t.IsDeleted && t.Type == TransactionType.Import && t.TransactionDate >= dayStart && t.TransactionDate < dayNext)
                .ToListAsync(cancellationToken);

            var outTxs = await _context.InventoryTransactions
                .Where(t => !t.IsDeleted && t.Type == TransactionType.Export && t.TransactionDate >= dayStart && t.TransactionDate < dayNext)
                .ToListAsync(cancellationToken);

            var dayReceipts = await _context.OutboundReceipts
                .Where(r => !r.IsDeleted && r.TransactionDate >= dayStart && r.TransactionDate < dayNext)
                .ToListAsync(cancellationToken);

            var inKg = inTxs.Sum(t => (double)t.Quantity);
            var inAmt = inTxs.Sum(t =>
            {
                if (t.TotalAmount > 0) return (double)t.TotalAmount;
                var price = t.UnitPrice > 0 ? (double)t.UnitPrice : defaultSeafoodPrice;
                return (double)t.Quantity * price;
            });

            var outKg = outTxs.Sum(t => (double)t.Quantity);
            var outAmt = dayReceipts.Count > 0 
                ? (double)dayReceipts.Sum(r => r.TotalAmount)
                : outTxs.Sum(t => (double)(t.TotalAmount > 0 ? t.TotalAmount : (t.Quantity * 250000m)));

            dailyFlow.Add(new
            {
                date = dayStart.ToString("dd/MM"),
                inboundKg = inKg,
                outboundKg = outKg,
                inboundAmount = inAmt,
                outboundAmount = outAmt
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

        // 7. Giao dịch gần nhất (Gom nhóm theo Phiếu Giao Dịch / Lô Hàng)
        var recentTxData = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .OrderByDescending(t => t.TransactionDate)
            .Take(50)
            .ToListAsync(cancellationToken);

        var recentReceipts = await _context.OutboundReceipts
            .Where(r => !r.IsDeleted)
            .Include(r => r.Supplies.Where(s => !s.IsDeleted))
            .ToDictionaryAsync(r => r.ReferenceNumber, r => r, cancellationToken);

        var recentTransactions = recentTxData
            .GroupBy(t => t.ReferenceNumber)
            .OrderByDescending(g => g.Max(x => x.TransactionDate))
            .Take(10)
            .Select(g =>
            {
                var first = g.First();
                var batchCodes = g.Select(x => x.LotBatch?.BatchCode).Where(b => !string.IsNullOrEmpty(b)).Distinct().ToList();
                var productNames = g.Select(x => x.LotBatch?.Product?.Name).Where(p => !string.IsNullOrEmpty(p)).Distinct().ToList();
                
                var totalWeight = (double)g.Sum(x => x.Quantity);
                double totalAmount = 0;
                double subTotal = 0;
                double suppliesTotal = 0;
                double discountAmount = 0;
                string discountReason = "";
                var suppliesList = new List<object>();

                if (first.Type == TransactionType.Export && recentReceipts.TryGetValue(g.Key, out var receipt))
                {
                    totalAmount = (double)receipt.TotalAmount;
                    subTotal = (double)receipt.SubTotal;
                    suppliesTotal = (double)receipt.SuppliesTotal;
                    discountAmount = (double)receipt.DiscountAmount;
                    discountReason = receipt.DiscountReason ?? "";
                    suppliesList = receipt.Supplies.Select(s => (object)new
                    {
                        name = s.Name,
                        packagingCode = s.PackagingCode,
                        unit = s.Unit,
                        quantity = s.Quantity,
                        unitPrice = (double)s.UnitPrice,
                        totalAmount = (double)s.TotalAmount
                    }).ToList();
                }
                else
                {
                    subTotal = (double)g.Sum(x =>
                    {
                        if (x.TotalAmount > 0) return x.TotalAmount;
                        var price = x.UnitPrice > 0 ? x.UnitPrice : (x.LotBatch != null && x.LotBatch.UnitPrice > 0 ? x.LotBatch.UnitPrice : 200000m);
                        return x.Quantity * price;
                    });
                    totalAmount = subTotal;
                }

                var items = g.Select(x =>
                {
                    var price = x.UnitPrice > 0 ? x.UnitPrice : (x.LotBatch != null && x.LotBatch.UnitPrice > 0 ? x.LotBatch.UnitPrice : 200000m);
                    var amt = x.TotalAmount > 0 ? x.TotalAmount : (x.Quantity * price);
                    return (object)new
                    {
                        batchCode = x.LotBatch?.BatchCode ?? "LÔ-GIAODICH",
                        productName = x.LotBatch?.Product?.Name ?? "Hải sản",
                        netWeight = (double)x.Quantity,
                        tareWeight = (double)x.TareWeight,
                        grossWeight = x.GrossWeight > 0 ? (double)x.GrossWeight : (double)(x.Quantity + x.TareWeight),
                        packagingCode = x.PackagingCode,
                        packagingQty = x.PackagingQty,
                        unitPrice = (double)price,
                        totalAmount = (double)amt
                    };
                }).ToList();

                return new
                {
                    id = g.Key,
                    type = first.Type == TransactionType.Import ? "INBOUND" : "OUTBOUND",
                    time = first.TransactionDate.ToString("yyyy-MM-dd HH:mm"),
                    partnerName = string.IsNullOrWhiteSpace(first.Note) ? (first.Type == TransactionType.Import ? "Nhà cung cấp" : "Khách hàng") : first.Note,
                    batchCode = batchCodes.Count > 0 ? string.Join(", ", batchCodes) : "N/A",
                    productName = productNames.Count > 0 ? string.Join(", ", productNames) : "Hải sản",
                    itemCount = g.Count(),
                    weightKg = totalWeight,
                    amount = totalAmount,
                    subTotal,
                    suppliesTotal,
                    discountAmount,
                    discountReason,
                    supplies = suppliesList,
                    items,
                    createdBy = first.CreatedBy
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
                todayInboundValue = new { value = todayInboundValue },
                todayOutboundKg = new { value = todayOutboundKg },
                todayOutboundTransactions = new { value = todayOutboundCount },
                todayOutboundValue = new { value = todayOutboundValue },
                monthlyLossRate = new { value = monthlyLossRate }
            },
            dailyFlow,
            categoryStock,
            recentTransactions
        };

        return Ok(Result<object>.Success(response));
    }
}
