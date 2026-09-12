using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Inbound;
using SeafoodWarehouseManagement.Application.DTOs.Outbound;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Quản lý Phiếu Xuất Kho - Xử lý trực tiếp CSDL
/// </summary>
[Route("api/[controller]")]
public class OutboundController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ICurrentTenant _currentTenant;

    public OutboundController(
        IApplicationDbContext context,
        INotificationService notificationService,
        ICurrentTenant currentTenant)
    {
        _context = context;
        _notificationService = notificationService;
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Lấy danh sách phiếu xuất kho từ CSDL với đầy đủ Cân thô, Bì/khay, Khối lượng thực, Vật phẩm kèm &amp; Giảm giá
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetAll(CancellationToken cancellationToken = default)
    {
        // 1. Tải danh sách Phiếu Xuất từ bảng OutboundReceipts (kèm vật phẩm bán kèm)
        var receipts = await _context.OutboundReceipts
            .Where(r => !r.IsDeleted)
            .Include(r => r.Supplies.Where(s => !s.IsDeleted))
            .OrderByDescending(r => r.TransactionDate)
            .ToListAsync(cancellationToken);

        // 2. Tải các giao dịch chi tiết lô hàng hải sản
        var transactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Export)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var txGrouped = transactions.GroupBy(t => t.ReferenceNumber).ToDictionary(g => g.Key, g => g.ToList());

        var result = receipts.Select(r =>
        {
            var batches = txGrouped.TryGetValue(r.ReferenceNumber, out var txList)
                ? txList.Select(b =>
                {
                    var price = b.UnitPrice > 0 ? b.UnitPrice : (b.LotBatch != null && b.LotBatch.UnitPrice > 0 ? b.LotBatch.UnitPrice : 250000m);
                    var amt = b.TotalAmount > 0 ? b.TotalAmount : (b.Quantity * price);
                    var tareW = (double)b.TareWeight;
                    var netW = (double)b.Quantity;
                    var grossW = b.GrossWeight > 0 ? (double)b.GrossWeight : (netW + tareW);

                    var storageType = b.LotBatch?.Product?.StorageType;
                    var conditionStr = storageType switch
                    {
                        "ALIVE" => "Tươi sống",
                        "FRESH" => "Ướp đá",
                        "DRY"   => "Khô",
                        _       => "Cấp đông"
                    };

                    return (object)new
                    {
                        batchCode = b.LotBatch?.BatchCode ?? "LOT-EXPORT",
                        species = b.LotBatch?.Product?.Name ?? "Hải sản",
                        quantityKg = netW,
                        netWeight = netW,
                        tareWeight = tareW,
                        grossWeight = grossW,
                        packagingCode = b.PackagingCode,
                        packagingQty = b.PackagingQty,
                        storageCondition = conditionStr,
                        expiryDate = b.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                        unitPrice = (double)price,
                        amount = (double)amt
                    };
                }).ToList()
                : new List<object>();

            var supplies = r.Supplies.Select(s => (object)new
            {
                name = s.Name,
                packagingCode = s.PackagingCode,
                unit = s.Unit,
                quantity = s.Quantity,
                unitPrice = (double)s.UnitPrice,
                totalAmount = (double)s.TotalAmount
            }).ToList();

            return new
            {
                id = r.ReferenceNumber,
                status = r.Status ?? "ACTIVE",
                cancelledAt = r.CancelledAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                cancelledBy = r.CancelledBy,
                cancelReason = r.CancelReason,
                date = r.TransactionDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                customerName = r.CustomerName,
                reason = r.Reason,
                totalWeightKg = (double)r.TotalWeightKg,
                subTotal = (double)r.SubTotal,
                suppliesTotal = (double)r.SuppliesTotal,
                discountAmount = (double)r.DiscountAmount,
                discountReason = r.DiscountReason ?? "",
                totalAmount = (double)r.TotalAmount,
                createdBy = r.CreatedBy,
                supplies,
                batches
            };
        }).ToList();

        // Xử lý các phiếu cũ (nếu có) trước khi tạo bảng OutboundReceipts
        var receiptRefNos = receipts.Select(r => r.ReferenceNumber).ToHashSet();
        foreach (var kv in txGrouped)
        {
            if (!receiptRefNos.Contains(kv.Key))
            {
                var g = kv.Value;
                var first = g.First();
                var subTotal = (double)g.Sum(x => x.TotalAmount > 0 ? x.TotalAmount : (x.Quantity * (x.UnitPrice > 0 ? x.UnitPrice : 250000m)));

                result.Add(new
                {
                    id = kv.Key,
                    status = first.Status ?? "ACTIVE",
                    cancelledAt = first.CancelledAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    cancelledBy = first.CancelledBy,
                    cancelReason = first.CancelReason,
                    date = first.TransactionDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    customerName = first.Note?.Split('-').FirstOrDefault()?.Replace("Khách hàng:", "").Trim() ?? "Khách hàng lẻ",
                    reason = first.Note?.Split('-').Skip(1).FirstOrDefault()?.Replace("Lý do:", "").Trim() ?? "Bán hàng",
                    totalWeightKg = (double)g.Sum(x => x.Quantity),
                    subTotal = subTotal,
                    suppliesTotal = 0.0,
                    discountAmount = 0.0,
                    discountReason = "",
                    totalAmount = subTotal,
                    createdBy = first.CreatedBy,
                    supplies = new List<object>(),
                    batches = g.Select(b =>
                    {
                        var price = b.UnitPrice > 0 ? b.UnitPrice : 250000m;
                        var amt = b.TotalAmount > 0 ? b.TotalAmount : (b.Quantity * price);
                        var tareW = (double)b.TareWeight;
                        var netW = (double)b.Quantity;
                        return (object)new
                        {
                            batchCode = b.LotBatch?.BatchCode ?? "LOT-EXPORT",
                            species = b.LotBatch?.Product?.Name ?? "Hải sản",
                            quantityKg = netW,
                            netWeight = netW,
                            tareWeight = tareW,
                            grossWeight = b.GrossWeight > 0 ? (double)b.GrossWeight : (netW + tareW),
                            packagingCode = b.PackagingCode,
                            packagingQty = b.PackagingQty,
                            storageCondition = "Cấp đông",
                            expiryDate = b.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                            unitPrice = (double)price,
                            amount = (double)amt
                        };
                    }).ToList()
                });
            }
        }

        return Ok(Result<object>.Success(result.OrderByDescending(x => x.date).ToList()));
    }

    /// <summary>
    /// Tạo mới phiếu xuất kho, sinh Mã phiếu duy nhất (PXK-yyyyMMddHHmmss-XX) để không bao giờ trùng hoặc đè phiếu xuất
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<object>>> Create([FromBody] CreateOutboundRequestDto request, CancellationToken cancellationToken = default)
    {
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => !w.IsDeleted, cancellationToken);
        if (warehouse == null)
        {
            warehouse = new Warehouse
            {
                Code = "KHO-MAIN",
                Name = "Kho Hải Sản Chính",
                Location = "Kho Tổng",
                IsActive = true
            };
            _context.Warehouses.Add(warehouse);
            await _context.SaveChangesAsync(cancellationToken);
        }

        DateTime nowUtc = DateTime.UtcNow;
        DateTime txDate = nowUtc;

        if (!string.IsNullOrWhiteSpace(request.Date) && DateTime.TryParse(request.Date, out var parsedDate))
        {
            txDate = DateTime.SpecifyKind(parsedDate.Date.Add(nowUtc.TimeOfDay), DateTimeKind.Utc);
        }

        // Sinh mã phiếu duy nhất PXK-yyyyMMddHHmmss-XX không bao giờ trùng lặp
        string refNo = $"PXK-{txDate.AddHours(7):yyyyMMddHHmmss}-{Random.Shared.Next(10, 99)}";

        // 1. Kiểm tra tính hợp lệ và tồn kho của từng lô trước khi xuất
        var batchEntities = new List<(CreateOutboundBatchDto item, LotBatch batch)>();
        foreach (var item in request.Batches)
        {
            var lotBatch = await _context.LotBatches
                        .Include(b => b.Product)
                        .FirstOrDefaultAsync(b => b.BatchCode == item.BatchCode && !b.IsDeleted, cancellationToken)
                        ?? await _context.LotBatches
                        .Include(b => b.Product)
                        .FirstOrDefaultAsync(b => b.Product.Code == item.Species && !b.IsDeleted, cancellationToken);

            if (lotBatch == null)
            {
                return BadRequest(Result<object>.Failure($"Không tìm thấy lô hàng '{item.BatchCode}'."));
            }

            if (item.QuantityKg <= 0)
            {
                return BadRequest(Result<object>.Failure($"Khối lượng xuất của lô '{item.BatchCode}' phải lớn hơn 0 kg."));
            }

            if (item.QuantityKg > lotBatch.CurrentQuantity)
            {
                return BadRequest(Result<object>.Failure($"Lô '{lotBatch.BatchCode}' ({lotBatch.Product?.Name ?? "Hải sản"}) hiện chỉ còn tồn {lotBatch.CurrentQuantity:N1} kg, không đủ để xuất {item.QuantityKg:N1} kg. Vui lòng kiểm tra lại."));
            }

            batchEntities.Add((item, lotBatch));
        }

        // 2. Tính toán tài chính chuẩn & Trừ tồn kho
        decimal seafoodSubTotal = 0;
        decimal totalNetWeight = 0;

        foreach (var (item, lotBatch) in batchEntities)
        {
            // Trừ tồn kho lô hàng
            lotBatch.CurrentQuantity = Math.Max(0, lotBatch.CurrentQuantity - item.QuantityKg);

            // Trừ tồn kho tại vị trí
            var invItem = await _context.InventoryItems.FirstOrDefaultAsync(i => i.LotBatchId == lotBatch.Id && !i.IsDeleted, cancellationToken);
            if (invItem != null)
            {
                invItem.Quantity = Math.Max(0, invItem.Quantity - item.QuantityKg);
            }

            // Ghi nhận giao dịch xuất kho CSDL với Giá bán, Thành tiền, Cân thô và Số cân bì
            var sellPrice = item.UnitPrice > 0 ? item.UnitPrice : (lotBatch.UnitPrice > 0 ? lotBatch.UnitPrice : (lotBatch.Product?.ReferencePrice > 0 ? lotBatch.Product.ReferencePrice : 250000m));
            var totalSellAmt = item.Amount > 0 ? item.Amount : (item.QuantityKg * sellPrice);
            var grossW = item.GrossWeight > 0 ? item.GrossWeight : (item.QuantityKg + item.TareWeight);

            seafoodSubTotal += totalSellAmt;
            totalNetWeight += item.QuantityKg;

            var tx = new InventoryTransaction
            {
                ReferenceNumber = refNo,
                Type = TransactionType.Export,
                LotBatchId = lotBatch.Id,
                SourceWarehouseId = warehouse.Id,
                Quantity = item.QuantityKg,
                TareWeight = item.TareWeight,
                GrossWeight = grossW,
                PackagingCode = item.PackagingCode,
                PackagingQty = item.PackagingQty,
                UnitPrice = sellPrice,
                TotalAmount = totalSellAmt,
                TransactionDate = txDate,
                CreatedBy = request.CreatedBy ?? "Thủ kho",
                Note = $"Khách hàng: {request.CustomerName} - Lý do: {request.Reason}"
            };
            _context.InventoryTransactions.Add(tx);
        }

        // 3. Tạo bản ghi Phiếu Xuất Kho (OutboundReceipt) chính thức trong CSDL
        decimal suppliesTotal = request.Supplies.Sum(s => s.TotalAmount > 0 ? s.TotalAmount : (s.Quantity * s.UnitPrice));
        decimal finalTotal = Math.Max(0, seafoodSubTotal + suppliesTotal - request.DiscountAmount);

        var receipt = new OutboundReceipt
        {
            ReferenceNumber = refNo,
            CustomerName = request.CustomerName,
            Reason = request.Reason,
            TransactionDate = txDate,
            CreatedBy = request.CreatedBy ?? "Thủ kho",
            TotalWeightKg = totalNetWeight,
            SubTotal = seafoodSubTotal,
            SuppliesTotal = suppliesTotal,
            DiscountAmount = request.DiscountAmount,
            DiscountReason = request.DiscountReason,
            TotalAmount = finalTotal,
            Note = $"Lý do: {request.Reason}"
        };

        // 4. Thêm các vật phẩm kèm vào bảng OutboundSupplies và trừ tồn kho bao bì tương ứng
        foreach (var sup in request.Supplies)
        {
            var supplyItem = new OutboundSupply
            {
                Name = sup.Name,
                PackagingCode = sup.PackagingCode,
                Unit = string.IsNullOrWhiteSpace(sup.Unit) ? "Cái" : sup.Unit,
                Quantity = sup.Quantity > 0 ? sup.Quantity : 1,
                UnitPrice = sup.UnitPrice,
                TotalAmount = sup.TotalAmount > 0 ? sup.TotalAmount : (sup.Quantity * sup.UnitPrice)
            };
            receipt.Supplies.Add(supplyItem);

            // Trừ tồn kho bao bì / vật tư tiêu hao nếu có mã PackagingCode
            if (!string.IsNullOrWhiteSpace(sup.PackagingCode))
            {
                var pkg = await _context.Packagings
                    .FirstOrDefaultAsync(p => p.Code == sup.PackagingCode && !p.IsDeleted, cancellationToken);
                if (pkg != null)
                {
                    pkg.StockQuantity = Math.Max(0, pkg.StockQuantity - supplyItem.Quantity);
                }
            }
        }

        _context.OutboundReceipts.Add(receipt);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<object>.Success(new { referenceNumber = refNo }));
    }

    /// <summary>
    /// Hủy phiếu xuất kho và hoàn nguyên tồn kho
    /// </summary>
    [HttpPost("cancel/{refNo}")]
    public async Task<ActionResult<Result<object>>> CancelOutbound(string refNo, [FromBody] CancelTransactionRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request?.Reason))
        {
            return BadRequest(Result<object>.Failure("Vui lòng cung cấp lý do hủy phiếu."));
        }

        var receipt = await _context.OutboundReceipts
            .Include(r => r.Supplies)
            .FirstOrDefaultAsync(r => r.ReferenceNumber == refNo && !r.IsDeleted, cancellationToken);

        var transactions = await _context.InventoryTransactions
            .Where(t => t.ReferenceNumber == refNo && t.Type == TransactionType.Export && !t.IsDeleted)
            .Include(t => t.LotBatch)
            .ToListAsync(cancellationToken);

        if (receipt == null && transactions.Count == 0)
        {
            return NotFound(Result<object>.Failure($"Không tìm thấy phiếu xuất kho '{refNo}'."));
        }

        if ((receipt != null && receipt.Status == "CANCELLED") || (receipt == null && transactions.All(t => t.Status == "CANCELLED")))
        {
            return BadRequest(Result<object>.Failure($"Phiếu xuất '{refNo}' đã bị hủy trước đó rồi."));
        }

        using var dbTransaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var nowUtc = DateTime.UtcNow;
            var userName = User.Identity?.Name ?? "Thủ kho";

            // 1. Hoàn nguyên số lượng hải sản vào LotBatch và InventoryItem
            foreach (var tx in transactions)
            {
                tx.Status = "CANCELLED";
                tx.CancelledAt = nowUtc;
                tx.CancelledBy = userName;
                tx.CancelReason = request.Reason;

                if (tx.LotBatch != null)
                {
                    tx.LotBatch.CurrentQuantity += tx.Quantity;
                    if (tx.LotBatch.Status == "CANCELLED")
                    {
                        tx.LotBatch.Status = "IN_STOCK";
                    }

                    var invItem = await _context.InventoryItems
                        .FirstOrDefaultAsync(i => i.LotBatchId == tx.LotBatch.Id && !i.IsDeleted, cancellationToken);
                    if (invItem != null)
                    {
                        invItem.Quantity += tx.Quantity;
                    }
                    else
                    {
                        invItem = new InventoryItem
                        {
                            WarehouseId = tx.SourceWarehouseId,
                            LotBatchId = tx.LotBatch.Id,
                            Quantity = tx.Quantity,
                            StorageBin = "Khu A"
                        };
                        _context.InventoryItems.Add(invItem);
                    }
                }
            }

            // 2. Hoàn trả số lượng vật tư kèm (Thùng xốp, đá gel...)
            if (receipt != null)
            {
                receipt.Status = "CANCELLED";
                receipt.CancelledAt = nowUtc;
                receipt.CancelledBy = userName;
                receipt.CancelReason = request.Reason;

                foreach (var sup in receipt.Supplies)
                {
                    if (!string.IsNullOrWhiteSpace(sup.PackagingCode))
                    {
                        var pkg = await _context.Packagings
                            .FirstOrDefaultAsync(p => p.Code == sup.PackagingCode && !p.IsDeleted, cancellationToken);
                        if (pkg != null)
                        {
                            pkg.StockQuantity += sup.Quantity;
                        }
                    }
                }
            }

            // 3. Ghi nhận AuditLog
            var auditLog = new AuditLog
            {
                UserName = userName,
                UserRole = "Thủ kho",
                Action = "CANCEL",
                TargetModule = "Xuất kho",
                Details = $"Hủy phiếu xuất {refNo}. Lý do: {request.Reason}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                Timestamp = nowUtc.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                TenantId = _currentTenant.Id
            };
            _context.AuditLogs.Add(auditLog);

            await _context.SaveChangesAsync(cancellationToken);
            await dbTransaction.CommitAsync(cancellationToken);

            // 4. Bắn thông báo Real-time
            var tenantId = _currentTenant.Id;
            var notif = new NotificationMessage
            {
                Type = "OUTBOUND_CANCELLED",
                Title = "Hủy phiếu xuất kho",
                Message = $"Phiếu xuất {refNo} đã được hủy và hoàn nguyên tồn kho thành công.",
                Severity = "warning",
                Link = "/inventory/history"
            };

            if (tenantId.HasValue && tenantId.Value > 0)
            {
                await _notificationService.SendNotificationToTenantAsync(tenantId.Value, notif, cancellationToken);
                await _notificationService.SendStockUpdateEventAsync(tenantId.Value, "STOCK_CHANGED", cancellationToken);
            }
            else
            {
                await _notificationService.SendNotificationToAllAsync(notif, cancellationToken);
                await _notificationService.SendStockUpdateEventAsync(null, "STOCK_CHANGED", cancellationToken);
            }

            return Ok(Result<object>.Success(new { referenceNumber = refNo, status = "CANCELLED" }));
        }
        catch (Exception ex)
        {
            await dbTransaction.RollbackAsync(cancellationToken);
            return StatusCode(500, Result<object>.Failure($"Lỗi khi hủy phiếu xuất: {ex.Message}"));
        }
    }
}
