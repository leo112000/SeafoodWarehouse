using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Inventory;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;
using SeafoodWarehouseManagement.Domain.Interfaces;

namespace SeafoodWarehouseManagement.Application.Services;

/// <summary>
/// Service quản lý tồn kho và giao dịch nhập/xuất/chuyển kho
/// </summary>
public class InventoryService : IInventoryService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IApplicationDbContext _context;

    public InventoryService(IUnitOfWork unitOfWork, IApplicationDbContext context)
    {
        _unitOfWork = unitOfWork;
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách tồn kho có phân trang, có thể lọc theo kho hoặc sản phẩm
    /// </summary>
    public async Task<PagedResult<InventoryItemDto>> GetInventoryAsync(PaginationParams pagination, int? warehouseId = null, int? productId = null, string? search = null, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<InventoryItem>();
        var cleanSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim().ToLower();

        var (items, totalCount) = await repository.GetPagedAsync(
            pagination.PageNumber,
            pagination.PageSize,
            predicate: i => (!warehouseId.HasValue || i.WarehouseId == warehouseId.Value) &&
                            (!productId.HasValue || (i.LotBatch != null && i.LotBatch.ProductId == productId.Value)) &&
                            i.Quantity > 0 &&
                            (cleanSearch == null ||
                             (i.LotBatch != null && (i.LotBatch.BatchCode.ToLower().Contains(cleanSearch) || (i.LotBatch.SupplierName != null && i.LotBatch.SupplierName.ToLower().Contains(cleanSearch)))) ||
                             (i.LotBatch != null && i.LotBatch.Product != null && (i.LotBatch.Product.Name.ToLower().Contains(cleanSearch) || i.LotBatch.Product.Code.ToLower().Contains(cleanSearch)))),
            orderBy: q => q.OrderByDescending(i => i.Id),
            cancellationToken: cancellationToken,
            includes: new System.Linq.Expressions.Expression<Func<InventoryItem, object>>[]
            {
                i => i.Warehouse,
                i => i.LotBatch,
                i => i.LotBatch.Product,
                i => i.LotBatch.Product.Category
            }
        );

        var result = items
            .Select(i => new InventoryItemDto
            {
                Id = i.Id,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse?.Name ?? string.Empty,
                LotBatchId = i.LotBatchId,
                BatchCode = i.LotBatch?.BatchCode ?? string.Empty,
                ProductId = i.LotBatch?.ProductId ?? (i.LotBatch?.Product?.Id ?? 0),
                ProductName = i.LotBatch?.Product?.Name ?? string.Empty,
                ProductCode = i.LotBatch?.Product?.Code ?? string.Empty,
                CategoryName = i.LotBatch?.Product?.Category?.Name ?? string.Empty,
                StorageBin = i.StorageBin,
                Quantity = i.Quantity,
                Unit = i.LotBatch?.Product?.Unit ?? "kg",
                UnitPrice = i.LotBatch?.UnitPrice > 0 ? i.LotBatch.UnitPrice : (i.LotBatch?.Product?.ReferencePrice ?? 0),
                ProductionDate = i.LotBatch?.ProductionDate,
                ExpirationDate = i.LotBatch?.ExpirationDate ?? DateTime.MinValue,
                Grade = i.LotBatch?.Grade ?? QualityGrade.GradeA,
                SupplierName = i.LotBatch?.SupplierName ?? string.Empty,
            })
            .ToList();

        return PagedResult<InventoryItemDto>.Create(result, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Lấy lịch sử giao dịch có phân trang, có thể lọc theo kho
    /// </summary>
    public async Task<PagedResult<InventoryTransactionDto>> GetTransactionsAsync(PaginationParams pagination, int? warehouseId = null, CancellationToken cancellationToken = default)
    {
        var repository = _unitOfWork.Repository<InventoryTransaction>();
        var transactions = await repository.GetAllWithIncludesAsync(
            t => t.LotBatch,
            t => t.LotBatch.Product,
            t => t.SourceWarehouse,
            t => t.DestinationWarehouse!);

        // Lọc theo kho nếu có (kho nguồn hoặc kho đích)
        var filtered = transactions.Where(t => !t.IsDeleted);
        if (warehouseId.HasValue)
        {
            filtered = filtered.Where(t => t.SourceWarehouseId == warehouseId.Value || t.DestinationWarehouseId == warehouseId.Value);
        }

        var transactionList = filtered.ToList();
        var totalCount = transactionList.Count;
        var result = transactionList
            .OrderByDescending(t => t.TransactionDate)
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(t => new InventoryTransactionDto
            {
                Id = t.Id,
                ReferenceNumber = t.ReferenceNumber,
                Type = t.Type,
                LotBatchId = t.LotBatchId,
                BatchCode = t.LotBatch?.BatchCode ?? string.Empty,
                ProductName = t.LotBatch?.Product?.Name ?? string.Empty,
                SourceWarehouseName = t.SourceWarehouse?.Name ?? string.Empty,
                DestinationWarehouseName = t.DestinationWarehouse?.Name,
                Quantity = t.Quantity,
                Unit = t.LotBatch?.Product?.Unit ?? "kg",
                TransactionDate = t.TransactionDate,
                CreatedBy = t.CreatedBy,
                Note = t.Note
            })
            .ToList();

        return PagedResult<InventoryTransactionDto>.Create(result, totalCount, pagination.PageNumber, pagination.PageSize);
    }

    /// <summary>
    /// Lấy lịch sử giao dịch tổng hợp (nhập/xuất) có phân trang từ CSDL Server
    /// </summary>
    public async Task<PagedResult<TransactionHistoryItemDto>> GetTransactionHistoryPagedAsync(
        TransactionHistoryQueryParams query,
        CancellationToken cancellationToken = default)
    {
        var cleanSearch = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToLower();
        var typeFilter = query.Type?.ToUpper() ?? "ALL";
        var statusFilter = query.Status?.ToUpper() ?? "ALL";

        var txQuery = _context.InventoryTransactions
            .Where(t => !t.IsDeleted);

        // Lọc Type: Nhập kho (Import) hoặc Xuất kho (Export)
        if (typeFilter == "INBOUND")
        {
            txQuery = txQuery.Where(t => t.Type == TransactionType.Import);
        }
        else if (typeFilter == "OUTBOUND")
        {
            txQuery = txQuery.Where(t => t.Type == TransactionType.Export);
        }

        // Lọc Status: ACTIVE hoặc CANCELLED
        if (statusFilter == "ACTIVE")
        {
            txQuery = txQuery.Where(t => t.Status != "CANCELLED");
        }
        else if (statusFilter == "CANCELLED")
        {
            txQuery = txQuery.Where(t => t.Status == "CANCELLED");
        }

        // Lọc theo khoảng ngày
        if (query.FromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(query.FromDate.Value.Date, DateTimeKind.Utc);
            txQuery = txQuery.Where(t => t.TransactionDate >= fromUtc);
        }
        if (query.ToDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(query.ToDate.Value.Date.AddDays(1), DateTimeKind.Utc);
            txQuery = txQuery.Where(t => t.TransactionDate < toUtc);
        }

        // Lọc theo từ khóa tìm kiếm (Mã phiếu, Đối tác, Tên hải sản, Mã lô)
        if (!string.IsNullOrEmpty(cleanSearch))
        {
            txQuery = txQuery.Where(t =>
                t.ReferenceNumber.ToLower().Contains(cleanSearch) ||
                (t.Note != null && t.Note.ToLower().Contains(cleanSearch)) ||
                (t.LotBatch != null && (
                    t.LotBatch.BatchCode.ToLower().Contains(cleanSearch) ||
                    (t.LotBatch.SupplierName != null && t.LotBatch.SupplierName.ToLower().Contains(cleanSearch)) ||
                    (t.LotBatch.Product != null && (
                        t.LotBatch.Product.Name.ToLower().Contains(cleanSearch) ||
                        t.LotBatch.Product.Code.ToLower().Contains(cleanSearch)
                    ))
                ))
            );
        }

        // Group by ReferenceNumber để đếm tổng số phiếu và lấy ngày mới nhất
        var groupQuery = txQuery
            .GroupBy(t => t.ReferenceNumber)
            .Select(g => new
            {
                ReferenceNumber = g.Key,
                MaxDate = g.Max(t => t.TransactionDate)
            });

        var totalCount = await groupQuery.CountAsync(cancellationToken);

        // Phân trang bằng Skip/Take trên mã phiếu
        var pagedRefNos = await groupQuery
            .OrderByDescending(g => g.MaxDate)
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(g => g.ReferenceNumber)
            .ToListAsync(cancellationToken);

        if (pagedRefNos.Count == 0)
        {
            return PagedResult<TransactionHistoryItemDto>.Create(
                new List<TransactionHistoryItemDto>(),
                totalCount,
                query.PageNumber,
                query.PageSize);
        }

        // Tải chi tiết các giao dịch của các ReferenceNumber thuộc trang này
        var pageTransactions = await _context.InventoryTransactions
            .Where(t => pagedRefNos.Contains(t.ReferenceNumber) && !t.IsDeleted)
            .Include(t => t.LotBatch).ThenInclude(l => l.Product)
            .Include(t => t.SourceWarehouse)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        // Tải các phiếu xuất từ OutboundReceipts tương ứng nếu có
        var outboundReceipts = await _context.OutboundReceipts
            .Where(r => pagedRefNos.Contains(r.ReferenceNumber) && !r.IsDeleted)
            .Include(r => r.Supplies.Where(s => !s.IsDeleted))
            .ToDictionaryAsync(r => r.ReferenceNumber, r => r, cancellationToken);

        // Kiểm tra an toàn: Có lô hàng nhập nào đã phát sinh xuất bán chưa
        var batchIds = pageTransactions.Where(t => t.LotBatchId > 0 && t.Type == TransactionType.Import).Select(t => t.LotBatchId).Distinct().ToList();
        var exportTxs = await _context.InventoryTransactions
            .Where(t => !t.IsDeleted && t.Status != "CANCELLED" && t.Type == TransactionType.Export && batchIds.Contains(t.LotBatchId))
            .Select(t => new { t.LotBatchId, t.ReferenceNumber })
            .ToListAsync(cancellationToken);

        var exportsByBatch = exportTxs
            .GroupBy(e => e.LotBatchId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.ReferenceNumber).Distinct().ToList());

        var groupedByRef = pageTransactions.GroupBy(t => t.ReferenceNumber).ToDictionary(g => g.Key, g => g.ToList());
        var itemsList = new List<TransactionHistoryItemDto>();

        foreach (var refNo in pagedRefNos)
        {
            if (!groupedByRef.TryGetValue(refNo, out var txList) || txList.Count == 0) continue;

            var first = txList.First();
            bool isOutbound = first.Type == TransactionType.Export;

            var receiptBatchIds = txList.Where(x => x.LotBatchId > 0).Select(x => x.LotBatchId).Distinct();
            var relatedExportRefs = receiptBatchIds
                .Where(bId => exportsByBatch.ContainsKey(bId))
                .SelectMany(bId => exportsByBatch[bId])
                .Distinct()
                .ToList();

            bool hasExports = relatedExportRefs.Count > 0;
            bool isCancelled = txList.All(t => t.Status == "CANCELLED");

            string partnerName = "";
            string partnerType = isOutbound ? "CUSTOMER" : "SUPPLIER";
            string storageLocation = first.SourceWarehouse?.Name ?? "Kho Hải Sản Chính";

            if (isOutbound)
            {
                if (outboundReceipts.TryGetValue(refNo, out var r))
                {
                    partnerName = r.CustomerName;
                }
                else
                {
                    partnerName = first.Note?.Replace("Khách hàng: ", "") ?? "Khách lẻ";
                }
            }
            else
            {
                partnerName = first.LotBatch?.SupplierName ?? (first.Note?.Replace("Nhà cung cấp: ", "") ?? "Vựa hải sản");
            }

            var detailItems = txList.Select(tx =>
            {
                var netW = tx.Quantity;
                var tareW = tx.TareWeight;
                var grossW = tx.GrossWeight > 0 ? tx.GrossWeight : (netW + tareW);
                var unitPrice = tx.UnitPrice > 0 ? tx.UnitPrice : (tx.LotBatch != null && tx.LotBatch.UnitPrice > 0 ? tx.LotBatch.UnitPrice : 250000m);
                var totalPrice = tx.TotalAmount > 0 ? tx.TotalAmount : (netW * unitPrice);

                return new TransactionHistoryDetailItemDto
                {
                    BatchCode = tx.LotBatch?.BatchCode ?? $"LÔ-{tx.LotBatchId}",
                    SeafoodName = tx.LotBatch?.Product?.Name ?? "Hải sản",
                    StorageCondition = tx.LotBatch?.Product?.StorageType switch
                    {
                        "ALIVE" => "Tươi sống",
                        "FRESH" => "Ướp đá",
                        _ => "Cấp đông"
                    },
                    GrossWeight = grossW,
                    TareWeight = tareW,
                    NetWeight = netW,
                    ExpiryDate = tx.LotBatch?.ExpirationDate.ToString("yyyy-MM-dd"),
                    UnitPrice = unitPrice,
                    TotalPrice = totalPrice
                };
            }).ToList();

            var suppliesList = new List<TransactionSupplyItemDto>();
            decimal subTotal = 0;
            decimal totalAmount = 0;
            decimal suppliesTotal = 0;
            decimal discountAmount = 0;
            string discountReason = "";

            if (isOutbound && outboundReceipts.TryGetValue(refNo, out var outboundReceipt))
            {
                totalAmount = outboundReceipt.TotalAmount;
                subTotal = outboundReceipt.SubTotal;
                suppliesTotal = outboundReceipt.SuppliesTotal;
                discountAmount = outboundReceipt.DiscountAmount;
                discountReason = outboundReceipt.DiscountReason ?? "";
                suppliesList = outboundReceipt.Supplies.Select(s => new TransactionSupplyItemDto
                {
                    Name = s.Name,
                    PackagingCode = s.PackagingCode,
                    Unit = s.Unit,
                    Quantity = s.Quantity,
                    UnitPrice = s.UnitPrice,
                    TotalAmount = s.TotalAmount
                }).ToList();
            }
            else
            {
                subTotal = detailItems.Sum(x => x.TotalPrice);
                totalAmount = subTotal;
            }

            itemsList.Add(new TransactionHistoryItemDto
            {
                Id = refNo,
                Type = isOutbound ? "OUTBOUND" : "INBOUND",
                Status = isCancelled ? "CANCELLED" : "ACTIVE",
                CancelledAt = first.CancelledAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                CancelledBy = first.CancelledBy,
                CancelReason = first.CancelReason,
                HasExports = hasExports,
                CanCancel = !hasExports && !isCancelled,
                ExportRefNos = relatedExportRefs,
                Date = first.TransactionDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                PartnerName = partnerName,
                PartnerType = partnerType,
                StorageLocation = storageLocation,
                TotalWeightKg = detailItems.Sum(x => x.NetWeight),
                TotalAmount = totalAmount,
                SubTotal = subTotal,
                SuppliesTotal = suppliesTotal,
                DiscountAmount = discountAmount,
                DiscountReason = discountReason,
                CreatedBy = first.CreatedBy ?? "Thủ kho",
                Items = detailItems,
                Supplies = suppliesList
            });
        }

        return PagedResult<TransactionHistoryItemDto>.Create(itemsList, totalCount, query.PageNumber, query.PageSize);
    }

    /// <summary>
    /// Nhập kho: tăng số lượng tồn kho và cập nhật lô hàng
    /// </summary>
    public async Task<Result<InventoryTransactionDto>> ImportAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra lô hàng tồn tại
        var lotBatchRepository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await lotBatchRepository.GetByIdWithIncludesAsync(dto.LotBatchId, l => l.Product);
        if (lotBatch == null || lotBatch.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy lô hàng với Id = {dto.LotBatchId}.");
        }

        // Kiểm tra kho tồn tại
        var warehouseRepository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await warehouseRepository.GetByIdAsync(dto.SourceWarehouseId, cancellationToken);
        if (warehouse == null || warehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho với Id = {dto.SourceWarehouseId}.");
        }

        // Tạo giao dịch nhập kho
        var transactionRepository = _unitOfWork.Repository<InventoryTransaction>();
        var transaction = new InventoryTransaction
        {
            ReferenceNumber = GenerateReferenceNumber("IMP"),
            Type = TransactionType.Import,
            LotBatchId = dto.LotBatchId,
            SourceWarehouseId = dto.SourceWarehouseId,
            DestinationWarehouseId = null,
            Quantity = dto.Quantity,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = dto.CreatedBy,
            Note = dto.Note
        };
        await transactionRepository.AddAsync(transaction, cancellationToken);

        // Tăng số lượng tồn kho của lô hàng
        lotBatch.CurrentQuantity += dto.Quantity;
        lotBatch.UpdatedAt = DateTime.UtcNow;
        lotBatchRepository.Update(lotBatch);

        // Tìm InventoryItem hiện có cho lô hàng trong kho
        var inventoryRepository = _unitOfWork.Repository<InventoryItem>();
        var existingItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.SourceWarehouseId && !i.IsDeleted,
            cancellationToken);

        if (existingItems.Any())
        {
            // Cập nhật số lượng cho item đầu tiên (hoặc item có StorageBin trống)
            var item = existingItems.First();
            item.Quantity += dto.Quantity;
            item.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(item);
        }
        else
        {
            // Tạo mới InventoryItem
            var newItem = new InventoryItem
            {
                WarehouseId = dto.SourceWarehouseId,
                LotBatchId = dto.LotBatchId,
                StorageBin = string.Empty,
                Quantity = dto.Quantity
            };
            await inventoryRepository.AddAsync(newItem, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InventoryTransactionDto>.Success(MapToDto(transaction, lotBatch), "Nhập kho thành công.");
    }

    /// <summary>
    /// Xuất kho: giảm số lượng tồn kho và cập nhật lô hàng
    /// </summary>
    public async Task<Result<InventoryTransactionDto>> ExportAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra lô hàng tồn tại
        var lotBatchRepository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await lotBatchRepository.GetByIdWithIncludesAsync(dto.LotBatchId, l => l.Product);
        if (lotBatch == null || lotBatch.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy lô hàng với Id = {dto.LotBatchId}.");
        }

        // Kiểm tra kho tồn tại
        var warehouseRepository = _unitOfWork.Repository<Warehouse>();
        var warehouse = await warehouseRepository.GetByIdAsync(dto.SourceWarehouseId, cancellationToken);
        if (warehouse == null || warehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho với Id = {dto.SourceWarehouseId}.");
        }

        // Kiểm tra số lượng tồn kho đủ
        if (lotBatch.CurrentQuantity < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng tồn kho không đủ. Hiện có {lotBatch.CurrentQuantity}, yêu cầu xuất {dto.Quantity}.");
        }

        // Tìm InventoryItem trong kho
        var inventoryRepository = _unitOfWork.Repository<InventoryItem>();
        var inventoryItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.SourceWarehouseId && !i.IsDeleted,
            cancellationToken);

        if (!inventoryItems.Any())
        {
            return Result<InventoryTransactionDto>.Failure("Không tìm thấy hàng tồn kho cho lô hàng này trong kho chỉ định.");
        }

        // Kiểm tra tổng số lượng trong kho đủ
        var totalInWarehouse = inventoryItems.Sum(i => i.Quantity);
        if (totalInWarehouse < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng trong kho không đủ. Hiện có {totalInWarehouse}, yêu cầu xuất {dto.Quantity}.");
        }

        // Tạo giao dịch xuất kho
        var transactionRepository = _unitOfWork.Repository<InventoryTransaction>();
        var transaction = new InventoryTransaction
        {
            ReferenceNumber = GenerateReferenceNumber("EXP"),
            Type = TransactionType.Export,
            LotBatchId = dto.LotBatchId,
            SourceWarehouseId = dto.SourceWarehouseId,
            DestinationWarehouseId = null,
            Quantity = dto.Quantity,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = dto.CreatedBy,
            Note = dto.Note
        };
        await transactionRepository.AddAsync(transaction, cancellationToken);

        // Giảm số lượng tồn kho của lô hàng
        lotBatch.CurrentQuantity -= dto.Quantity;
        lotBatch.UpdatedAt = DateTime.UtcNow;
        lotBatchRepository.Update(lotBatch);

        // Giảm số lượng InventoryItem (ưu tiên giảm từ item có số lượng lớn nhất)
        var remainingToExport = dto.Quantity;
        foreach (var item in inventoryItems.OrderByDescending(i => i.Quantity))
        {
            if (remainingToExport <= 0) break;

            var deduct = Math.Min(item.Quantity, remainingToExport);
            item.Quantity -= deduct;
            remainingToExport -= deduct;
            item.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(item);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InventoryTransactionDto>.Success(MapToDto(transaction, lotBatch), "Xuất kho thành công.");
    }

    /// <summary>
    /// Chuyển kho: giảm tồn kho nguồn, tăng tồn kho đích
    /// </summary>
    public async Task<Result<InventoryTransactionDto>> TransferAsync(CreateTransactionDto dto, CancellationToken cancellationToken = default)
    {
        // Kiểm tra kho đích được chỉ định
        if (!dto.DestinationWarehouseId.HasValue)
        {
            return Result<InventoryTransactionDto>.Failure("Kho đích là bắt buộc khi chuyển kho.");
        }

        // Kiểm tra kho nguồn và kho đích khác nhau
        if (dto.SourceWarehouseId == dto.DestinationWarehouseId.Value)
        {
            return Result<InventoryTransactionDto>.Failure("Kho nguồn và kho đích không được giống nhau.");
        }

        // Kiểm tra lô hàng tồn tại
        var lotBatchRepository = _unitOfWork.Repository<LotBatch>();
        var lotBatch = await lotBatchRepository.GetByIdWithIncludesAsync(dto.LotBatchId, l => l.Product);
        if (lotBatch == null || lotBatch.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy lô hàng với Id = {dto.LotBatchId}.");
        }

        // Kiểm tra cả 2 kho tồn tại
        var warehouseRepository = _unitOfWork.Repository<Warehouse>();
        var sourceWarehouse = await warehouseRepository.GetByIdAsync(dto.SourceWarehouseId, cancellationToken);
        if (sourceWarehouse == null || sourceWarehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho nguồn với Id = {dto.SourceWarehouseId}.");
        }

        var destWarehouse = await warehouseRepository.GetByIdAsync(dto.DestinationWarehouseId.Value, cancellationToken);
        if (destWarehouse == null || destWarehouse.IsDeleted)
        {
            return Result<InventoryTransactionDto>.Failure($"Không tìm thấy kho đích với Id = {dto.DestinationWarehouseId.Value}.");
        }

        // Kiểm tra số lượng tồn kho nguồn đủ
        if (lotBatch.CurrentQuantity < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng tồn kho không đủ. Hiện có {lotBatch.CurrentQuantity}, yêu cầu chuyển {dto.Quantity}.");
        }

        // Tìm InventoryItem ở kho nguồn
        var inventoryRepository = _unitOfWork.Repository<InventoryItem>();
        var sourceItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.SourceWarehouseId && !i.IsDeleted,
            cancellationToken);

        if (!sourceItems.Any())
        {
            return Result<InventoryTransactionDto>.Failure("Không tìm thấy hàng tồn kho ở kho nguồn cho lô hàng này.");
        }

        // Kiểm tra tổng số lượng ở kho nguồn đủ
        var totalInSource = sourceItems.Sum(i => i.Quantity);
        if (totalInSource < dto.Quantity)
        {
            return Result<InventoryTransactionDto>.Failure($"Số lượng ở kho nguồn không đủ. Hiện có {totalInSource}, yêu cầu chuyển {dto.Quantity}.");
        }

        // Tạo giao dịch chuyển kho
        var transactionRepository = _unitOfWork.Repository<InventoryTransaction>();
        var transaction = new InventoryTransaction
        {
            ReferenceNumber = GenerateReferenceNumber("TRF"),
            Type = TransactionType.Transfer,
            LotBatchId = dto.LotBatchId,
            SourceWarehouseId = dto.SourceWarehouseId,
            DestinationWarehouseId = dto.DestinationWarehouseId,
            Quantity = dto.Quantity,
            TransactionDate = DateTime.UtcNow,
            CreatedBy = dto.CreatedBy,
            Note = dto.Note
        };
        await transactionRepository.AddAsync(transaction, cancellationToken);

        // Giảm số lượng InventoryItem ở kho nguồn
        var remainingToTransfer = dto.Quantity;
        foreach (var item in sourceItems.OrderByDescending(i => i.Quantity))
        {
            if (remainingToTransfer <= 0) break;

            var deduct = Math.Min(item.Quantity, remainingToTransfer);
            item.Quantity -= deduct;
            remainingToTransfer -= deduct;
            item.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(item);
        }

        // Tăng số lượng InventoryItem ở kho đích
        var destItems = await inventoryRepository.FindAsync(
            i => i.LotBatchId == dto.LotBatchId && i.WarehouseId == dto.DestinationWarehouseId.Value && !i.IsDeleted,
            cancellationToken);

        if (destItems.Any())
        {
            // Cập nhật số lượng cho item đầu tiên ở kho đích
            var destItem = destItems.First();
            destItem.Quantity += dto.Quantity;
            destItem.UpdatedAt = DateTime.UtcNow;
            inventoryRepository.Update(destItem);
        }
        else
        {
            // Tạo mới InventoryItem ở kho đích
            var newDestItem = new InventoryItem
            {
                WarehouseId = dto.DestinationWarehouseId.Value,
                LotBatchId = dto.LotBatchId,
                StorageBin = string.Empty,
                Quantity = dto.Quantity
            };
            await inventoryRepository.AddAsync(newDestItem, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InventoryTransactionDto>.Success(MapToDto(transaction, lotBatch), "Chuyển kho thành công.");
    }

    /// <summary>
    /// Map InventoryTransaction + LotBatch sang DTO
    /// </summary>
    private static InventoryTransactionDto MapToDto(InventoryTransaction transaction, LotBatch lotBatch)
    {
        return new InventoryTransactionDto
        {
            Id = transaction.Id,
            ReferenceNumber = transaction.ReferenceNumber,
            Type = transaction.Type,
            LotBatchId = transaction.LotBatchId,
            BatchCode = lotBatch.BatchCode,
            ProductName = lotBatch.Product?.Name ?? string.Empty,
            SourceWarehouseName = string.Empty, // Sẽ được set sau khi load
            DestinationWarehouseName = null,
            Quantity = transaction.Quantity,
            Unit = lotBatch.Product?.Unit ?? "kg",
            TransactionDate = transaction.TransactionDate,
            CreatedBy = transaction.CreatedBy,
            Note = transaction.Note
        };
    }

    /// <summary>
    /// Sinh mã tham chiếu giao dịch theo định dạng: PREFIX-YYYYMMDD-XXX
    /// </summary>
    private static string GenerateReferenceNumber(string prefix)
    {
        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        var randomPart = Random.Shared.Next(100, 999).ToString();
        return $"{prefix}-{datePart}-{randomPart}";
    }
}