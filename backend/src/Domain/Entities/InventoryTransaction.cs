using SeafoodWarehouseManagement.Domain.Common;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class InventoryTransaction : BaseEntity, IMustHaveTenant
{
    public string ReferenceNumber { get; set; } = string.Empty; // Mã phiếu nhập/xuất
    public TransactionType Type { get; set; }
    
    public int LotBatchId { get; set; }
    public LotBatch LotBatch { get; set; } = null!;

    public int SourceWarehouseId { get; set; }
    public Warehouse SourceWarehouse { get; set; } = null!;

    public int? DestinationWarehouseId { get; set; }
    public Warehouse? DestinationWarehouse { get; set; }

    public decimal Quantity { get; set; } // Khối lượng thực tế (Net weight)
    public decimal TareWeight { get; set; } = 0; // Số cân bì/khay (Tare weight)
    public decimal GrossWeight { get; set; } = 0; // Cân thô (Gross weight = Quantity + TareWeight)
    public string? PackagingCode { get; set; } // Mã bao bì / khay sử dụng
    public int PackagingQty { get; set; } = 0; // Số lượng bao bì / khay

    public decimal UnitPrice { get; set; } = 0; // Đơn giá giao dịch (Giá nhập nếu Import, Giá bán nếu Export)
    public decimal TotalAmount { get; set; } = 0; // Thành tiền (Quantity * UnitPrice)

    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "System";
    public string? Note { get; set; }
    public int? TenantId { get; set; }
}
