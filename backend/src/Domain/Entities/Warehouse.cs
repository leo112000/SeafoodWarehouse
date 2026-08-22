using SeafoodWarehouseManagement.Domain.Common;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class Warehouse : BaseEntity, IMustHaveTenant
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public StorageType Type { get; set; } = StorageType.FrozenStorage;
    public double TargetTemperature { get; set; } = -18.0;
    public decimal MaxCapacityTon { get; set; }
    public bool IsActive { get; set; } = true;
    public int? TenantId { get; set; }

    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
