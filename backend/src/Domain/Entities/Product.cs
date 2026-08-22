using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class Product : BaseEntity, IMustHaveTenant
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Unit { get; set; } = "kg"; // kg, thùng, con
    public decimal MinimumStock { get; set; }
    public decimal MaximumStock { get; set; }
    public double TargetTemperature { get; set; } // Temp in Celsius e.g. -18.0
    public string? ScientificName { get; set; } // Tên khoa học của thủy hải sản
    public decimal ReferencePrice { get; set; } // Đơn giá tham chiếu (VNĐ)
    public int WarningDaysBeforeExpiry { get; set; } = 3; // Cảnh báo trước HSD bao nhiêu ngày
    public string StorageType { get; set; } = "FROZEN"; // ALIVE, FRESH, FROZEN, DRY
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public string? Description { get; set; } // Ghi chú
    public int? TenantId { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public ICollection<LotBatch> LotBatches { get; set; } = new List<LotBatch>();
}
