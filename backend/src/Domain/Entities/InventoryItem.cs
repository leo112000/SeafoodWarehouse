using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class InventoryItem : BaseEntity
{
    public int WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public int LotBatchId { get; set; }
    public LotBatch LotBatch { get; set; } = null!;

    public string StorageBin { get; set; } = string.Empty; // Vị trí kệ/kệ hàng (VD: A-01-02)
    public decimal Quantity { get; set; }
}
