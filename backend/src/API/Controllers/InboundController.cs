using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Inbound;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API Quản lý Phiếu Nhập Kho - Xử lý trực tiếp CSDL
/// </summary>
[Route("api/[controller]")]
public class InboundController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ICurrentTenant _currentTenant;

    public InboundController(
        IApplicationDbContext context,
        INotificationService notificationService,
        ICurrentTenant currentTenant)
    {
        _context = context;
        _notificationService = notificationService;
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Lấy danh sách phiếu nhập kho từ CSDL với đầy đủ khối lượng, điều kiện bảo quản thực và ngày giờ nhập
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<object>>> GetAll(CancellationToken cancellationToken = default)
    {
        var transactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Type == TransactionType.Import)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .Include(t => t.SourceWarehouse)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var batchIds = transactions.Where(t => t.LotBatchId > 0).Select(t => t.LotBatchId).Distinct().ToList();
        var exportTxs = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Status != "CANCELLED" && t.Type == TransactionType.Export && batchIds.Contains(t.LotBatchId))
            .Select(t => new { t.LotBatchId, t.ReferenceNumber })
            .ToListAsync(cancellationToken);

        var exportsByBatch = exportTxs
            .GroupBy(e => e.LotBatchId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.ReferenceNumber).Distinct().ToList());

        var grouped = transactions
            .GroupBy(t => t.ReferenceNumber)
            .Select(g =>
            {
                var receiptBatchIds = g.Where(x => x.LotBatchId > 0).Select(x => x.LotBatchId).Distinct();
                var relatedExportRefs = receiptBatchIds
                    .Where(bId => exportsByBatch.ContainsKey(bId))
                    .SelectMany(bId => exportsByBatch[bId])
                    .Distinct()
                    .ToList();

                bool hasExports = relatedExportRefs.Count > 0 || g.Any(x => x.LotBatch != null && x.LotBatch.CurrentQuantity < x.LotBatch.InitialQuantity);
                bool canCancel = (g.First().Status != "CANCELLED") && !hasExports;

                return new
                {
                    id = g.Key,
                    status = g.First().Status ?? "ACTIVE",
                    cancelledAt = g.First().CancelledAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    cancelledBy = g.First().CancelledBy,
                    cancelReason = g.First().CancelReason,
                    hasExports,
                    canCancel,
                    exportRefNos = relatedExportRefs,
                    supplier = g.First().Note?.Split('-').FirstOrDefault()?.Replace("Nhà cung cấp:", "").Trim() ?? "Nhà cung cấp",
                    inboundDate = g.First().TransactionDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    storageLocation = g.First().SourceWarehouse?.Name ?? "Kho chính",
                    totalAmount = (double)g.Sum(x => x.TotalAmount > 0 ? x.TotalAmount : (x.Quantity * (x.UnitPrice > 0 ? x.UnitPrice : (x.LotBatch != null && x.LotBatch.UnitPrice > 0 ? x.LotBatch.UnitPrice : 250000m)))),
                    items = g.Select(i =>
                    {
                        var price = i.UnitPrice > 0 ? i.UnitPrice : (i.LotBatch != null && i.LotBatch.UnitPrice > 0 ? i.LotBatch.UnitPrice : 250000m);
                        var amt = i.TotalAmount > 0 ? i.TotalAmount : (i.Quantity * price);
                        var tareW = (double)i.TareWeight;
                        var netW = (double)i.Quantity;
                        var grossW = i.GrossWeight > 0 ? (double)i.GrossWeight : (netW + tareW);

                        var storageType = i.LotBatch?.Product?.StorageType;
                        var conditionStr = storageType switch
                        {
                            "ALIVE" => "Tươi sống",
                            "FRESH" => "Ướp đá",
                            "DRY"   => "Khô",
                            _       => "Cấp đông"
                        };

                        return new
                        {
                            seafoodName = i.LotBatch?.Product?.Name ?? "Hải sản",
                            seafoodCode = i.LotBatch?.Product?.Code ?? "HS-001",
                            totalWeight = grossW,
                            tareWeight = tareW,
                            netWeight = netW,
                            grossWeight = grossW,
                            packagingCode = i.PackagingCode,
                            packagingQty = i.PackagingQty,
                            storageCondition = conditionStr,
                            catchDate = i.LotBatch?.ProductionDate.ToString("yyyy-MM-dd"),
                            expiryDate = i.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                            unitPrice = (double)price,
                            totalPrice = (double)amt,
                            batchCode = i.LotBatch?.BatchCode ?? "LOT-001",
                            initialQuantity = (double)(i.LotBatch?.InitialQuantity ?? 0),
                            currentQuantity = (double)(i.LotBatch?.CurrentQuantity ?? 0)
                        };
                    }).ToList()
                };
            }).ToList();

        return Ok(Result<object>.Success(grouped));
    }

    /// <summary>
    /// Tạo mới phiếu nhập kho, sinh Mã phiếu duy nhất (PNK-yyyyMMddHHmmss-XX) để không bao giờ trùng hoặc đè phiếu
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<object>>> Create([FromBody] CreateInboundRequestDto request, CancellationToken cancellationToken = default)
    {
        Warehouse? warehouse = null;
        if (!string.IsNullOrWhiteSpace(request.StorageLocation))
        {
            warehouse = await _context.Warehouses.FirstOrDefaultAsync(w =>
                (w.Name == request.StorageLocation || w.Code == request.StorageLocation || w.Id.ToString() == request.StorageLocation)
                && !w.IsDeleted, cancellationToken);
        }
        warehouse ??= await _context.Warehouses.FirstOrDefaultAsync(w => !w.IsDeleted, cancellationToken);
        if (warehouse == null)
        {
            warehouse = new Warehouse
            {
                Code = "KHO-MAIN",
                Name = string.IsNullOrWhiteSpace(request.StorageLocation) ? "Kho Hải Sản Chính" : request.StorageLocation,
                Location = "Kho Tổng",
                IsActive = true
            };
            _context.Warehouses.Add(warehouse);
            await _context.SaveChangesAsync(cancellationToken);
        }

        DateTime nowUtc = DateTime.UtcNow;
        DateTime txDate = nowUtc;

        if (!string.IsNullOrWhiteSpace(request.InboundDate) && DateTime.TryParse(request.InboundDate, out var parsedInDate))
        {
            txDate = DateTime.SpecifyKind(parsedInDate.Date.Add(nowUtc.TimeOfDay), DateTimeKind.Utc);
        }

        // Sinh mã phiếu duy nhất PNK-yyyyMMddHHmmss-XX không bao giờ trùng lặp
        string refNo = $"PNK-{txDate.AddHours(7):yyyyMMddHHmmss}-{Random.Shared.Next(10, 99)}";

        var category = await _context.Categories.FirstOrDefaultAsync(c => !c.IsDeleted, cancellationToken);
        if (category == null)
        {
            category = new Category { Code = "HAISAN", Name = "Hải sản tổng hợp", Description = "Danh mục mặc định" };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync(cancellationToken);
        }

        foreach (var item in request.Items)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Code == item.SeafoodCode && !p.IsDeleted, cancellationToken)
                       ?? await _context.Products.FirstOrDefaultAsync(p => p.Name == item.SeafoodName && !p.IsDeleted, cancellationToken);

            string mappedStorageType = item.StorageCondition switch
            {
                "Tươi sống" => "ALIVE",
                "Ướp đá"   => "FRESH",
                "Khô"      => "DRY",
                _          => "FROZEN"
            };

            if (product == null)
            {
                product = new Product
                {
                    Code = string.IsNullOrWhiteSpace(item.SeafoodCode) ? $"HS-{DateTime.UtcNow:yyyyMMddHHmmss}" : item.SeafoodCode,
                    Name = string.IsNullOrWhiteSpace(item.SeafoodName) ? "Hải sản tươi" : item.SeafoodName,
                    CategoryId = category.Id,
                    Unit = "Kg",
                    StorageType = mappedStorageType,
                    TargetTemperature = -1,
                    WarningDaysBeforeExpiry = 5,
                    MinimumStock = 10,
                    MaximumStock = 1000,
                    ReferencePrice = item.UnitPrice > 0 ? item.UnitPrice : 250000m,
                    Status = "ACTIVE"
                };
                _context.Products.Add(product);
                await _context.SaveChangesAsync(cancellationToken);
            }
            else
            {
                product.StorageType = mappedStorageType;
                _context.Products.Update(product);
                await _context.SaveChangesAsync(cancellationToken);
            }

            var netQty = item.NetWeight > 0 ? item.NetWeight : item.TotalWeight;

            string bCode = string.IsNullOrWhiteSpace(item.BatchCode) ? $"LOT-{product.Code}-{txDate:yyyyMMddHHmmss}" : item.BatchCode;
            if (await _context.LotBatches.AnyAsync(b => b.BatchCode == bCode && !b.IsDeleted, cancellationToken))
            {
                bCode = $"{bCode}-{Random.Shared.Next(10, 99)}";
            }

            var lotBatch = new LotBatch
            {
                BatchCode = bCode,
                ProductId = product.Id,
                ProductionDate = DateTime.TryParse(item.CatchDate, out var pDate) ? DateTime.SpecifyKind(pDate, DateTimeKind.Utc) : txDate,
                ExpirationDate = DateTime.TryParse(item.ExpiryDate, out var eDate) ? DateTime.SpecifyKind(eDate, DateTimeKind.Utc) : txDate.AddMonths(6),
                InitialQuantity = netQty,
                CurrentQuantity = netQty,
                UnitPrice = item.UnitPrice > 0 ? item.UnitPrice : (product.ReferencePrice > 0 ? product.ReferencePrice : 250000m),
                SupplierName = request.Supplier ?? "Vựa hải sản",
                TareWeight = item.TareWeight,
                PackagingCode = item.PackagingCode,
                PackagingQty = item.PackagingQty
            };

            _context.LotBatches.Add(lotBatch);
            await _context.SaveChangesAsync(cancellationToken);

            var invItem = new InventoryItem
            {
                WarehouseId = warehouse.Id,
                LotBatchId = lotBatch.Id,
                StorageBin = string.IsNullOrWhiteSpace(request.StorageLocation) ? "Slot-A1" : request.StorageLocation,
                Quantity = lotBatch.CurrentQuantity
            };
            _context.InventoryItems.Add(invItem);

            var unitPrice = item.UnitPrice > 0 ? item.UnitPrice : (product.ReferencePrice > 0 ? product.ReferencePrice : 250000m);
            var totalAmt = item.TotalPrice > 0 ? item.TotalPrice : (netQty * unitPrice);
            var grossW = item.TotalWeight > 0 ? item.TotalWeight : (netQty + item.TareWeight);

            var tx = new InventoryTransaction
            {
                ReferenceNumber = refNo,
                Type = TransactionType.Import,
                LotBatchId = lotBatch.Id,
                SourceWarehouseId = warehouse.Id,
                Quantity = netQty,
                TareWeight = item.TareWeight,
                GrossWeight = grossW,
                PackagingCode = item.PackagingCode,
                PackagingQty = item.PackagingQty,
                UnitPrice = unitPrice,
                TotalAmount = totalAmt,
                TransactionDate = txDate,
                CreatedBy = "Thủ kho",
                Note = $"Nhà cung cấp: {request.Supplier}"
            };
            _context.InventoryTransactions.Add(tx);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Bắn thông báo Real-time và trigger cập nhật tồn kho
        var tenantId = _currentTenant.Id;
        var totalWeightKg = request.Items.Sum(i => i.NetWeight > 0 ? i.NetWeight : i.TotalWeight);
        var notif = new NotificationMessage
        {
            Type = "INBOUND",
            Title = "Nhập kho hải sản mới",
            Message = $"Phiếu {refNo} ({request.Items.Count} mặt hàng, tổng {totalWeightKg:N1}kg) từ '{request.Supplier}' đã được nhập kho thành công.",
            Severity = "success",
            Link = "/inventory/history"
        };

        if (tenantId.HasValue && tenantId.Value > 0)
        {
            await _notificationService.SendNotificationToTenantAsync(tenantId.Value, notif, cancellationToken);
            await _notificationService.SendStockUpdateEventAsync(tenantId.Value, "INBOUND_CREATED", cancellationToken);
        }
        else
        {
            await _notificationService.SendNotificationToAllAsync(notif, cancellationToken);
            await _notificationService.SendStockUpdateEventAsync(null, "INBOUND_CREATED", cancellationToken);
        }

        return Ok(Result<object>.Success(new { referenceNumber = refNo }));
    }

    /// <summary>
    /// Hủy phiếu nhập kho và hoàn nguyên tồn kho
    /// </summary>
    [HttpPost("cancel/{refNo}")]
    public async Task<ActionResult<Result<object>>> CancelInbound(string refNo, [FromBody] CancelTransactionRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request?.Reason))
        {
            return BadRequest(Result<object>.Failure("Vui lòng cung cấp lý do hủy phiếu."));
        }

        var transactions = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.ReferenceNumber == refNo && t.Type == TransactionType.Import)
            .Include(t => t.LotBatch)
            .ToListAsync(cancellationToken);

        if (transactions.Count == 0)
        {
            return NotFound(Result<object>.Failure($"Không tìm thấy phiếu nhập kho '{refNo}'."));
        }

        if (transactions.All(t => t.Status == "CANCELLED"))
        {
            return BadRequest(Result<object>.Failure($"Phiếu nhập '{refNo}' đã bị hủy trước đó rồi."));
        }

        // Kiểm tra an toàn: Có lô hàng nào đã bị xuất bán chưa?
        var batchIds = transactions.Where(t => t.LotBatchId > 0).Select(t => t.LotBatchId).Distinct().ToList();

        // 1. Kiểm tra các phiếu xuất kho đang hoạt động liên quan trực tiếp đến các lô hàng này
        var activeExportTxs = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Status != "CANCELLED" && t.Type == TransactionType.Export && batchIds.Contains(t.LotBatchId))
            .Include(t => t.LotBatch)
            .ToListAsync(cancellationToken);

        if (activeExportTxs.Count > 0)
        {
            var exportRefNos = activeExportTxs.Select(e => e.ReferenceNumber).Distinct().ToList();
            var batchCodes = activeExportTxs.Select(e => e.LotBatch?.BatchCode).Where(b => !string.IsNullOrEmpty(b)).Distinct().ToList();
            var totalExportKg = activeExportTxs.Sum(e => e.Quantity);

            return BadRequest(Result<object>.Failure(
                $"Không thể hủy phiếu nhập '{refNo}' vì lô [{string.Join(", ", batchCodes)}] đã phát sinh xuất bán ({totalExportKg:N1} kg) trong các phiếu xuất: {string.Join(", ", exportRefNos)}. Vui lòng hủy các phiếu xuất liên quan trước để hoàn nguyên tồn kho."));
        }

        // 2. Kiểm tra bổ sung số lượng tồn kho của lô
        foreach (var tx in transactions)
        {
            if (tx.LotBatch != null)
            {
                // Nếu CurrentQuantity < InitialQuantity nghĩa là đã phát sinh xuất bán hoặc hao hụt
                if (tx.LotBatch.CurrentQuantity < tx.LotBatch.InitialQuantity)
                {
                    var sold = tx.LotBatch.InitialQuantity - tx.LotBatch.CurrentQuantity;
                    return BadRequest(Result<object>.Failure(
                        $"Không thể hủy phiếu nhập '{refNo}' vì lô '{tx.LotBatch.BatchCode}' không còn nguyên vẹn tồn kho (đã xuất {sold:N1} kg, hiện chỉ còn {tx.LotBatch.CurrentQuantity:N1} kg / ban đầu {tx.LotBatch.InitialQuantity:N1} kg). Vui lòng hủy các phiếu xuất liên quan trước."));
                }
            }
        }

        // Thực hiện rollback trong transaction DB
        using var dbTransaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var nowUtc = DateTime.UtcNow;
            var userName = User.Identity?.Name ?? "Thủ kho";

            foreach (var tx in transactions)
            {
                tx.Status = "CANCELLED";
                tx.CancelledAt = nowUtc;
                tx.CancelledBy = userName;
                tx.CancelReason = request.Reason;

                if (tx.LotBatch != null)
                {
                    tx.LotBatch.CurrentQuantity = 0;
                    tx.LotBatch.Status = "CANCELLED";

                    // Trừ số lượng tồn trong InventoryItems tương ứng
                    var invItems = await _context.InventoryItems
                        .Where(i => !i.IsDeleted && i.LotBatchId == tx.LotBatch.Id)
                        .ToListAsync(cancellationToken);

                    foreach (var invItem in invItems)
                    {
                        invItem.Quantity = 0;
                        invItem.IsDeleted = true;
                    }
                }
            }

            // Ghi AuditLog
            var auditLog = new AuditLog
            {
                UserName = userName,
                UserRole = "Thủ kho",
                Action = "CANCEL",
                TargetModule = "Nhập kho",
                Details = $"Hủy phiếu nhập {refNo}. Lý do: {request.Reason}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                Timestamp = nowUtc.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                TenantId = _currentTenant.Id
            };
            _context.AuditLogs.Add(auditLog);

            await _context.SaveChangesAsync(cancellationToken);
            await dbTransaction.CommitAsync(cancellationToken);

            // Bắn thông báo Real-time
            var tenantId = _currentTenant.Id;
            var notif = new NotificationMessage
            {
                Type = "INBOUND_CANCELLED",
                Title = "Hủy phiếu nhập kho",
                Message = $"Phiếu nhập {refNo} đã được hủy và hoàn nguyên tồn kho thành công.",
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
            return StatusCode(500, Result<object>.Failure($"Lỗi khi hủy phiếu nhập: {ex.Message}"));
        }
    }
}
