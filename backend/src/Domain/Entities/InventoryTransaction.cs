using SeafoodWarehouseManagement.Domain.Common;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class InventoryTransaction : BaseEntity
{
    public string ReferenceNumber { get; set; } = string.Empty; // Mã phiếu nhập/xuất
    public TransactionType Type { get; set; }
    
    public int LotBatchId { get; set; }
    public LotBatch LotBatch { get; set; } = null!;

    public int SourceWarehouseId { get; set; }
    public Warehouse SourceWarehouse { get; set; } = null!;

    public int? DestinationWarehouseId { get; set; }
    public Warehouse? DestinationWarehouse { get; set; }

    public decimal Quantity { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "System";
    public string? Note { get; set; }
}
