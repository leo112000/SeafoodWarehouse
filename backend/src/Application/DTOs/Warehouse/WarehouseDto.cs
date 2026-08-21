using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.Warehouse;

public class WarehouseDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public StorageType Type { get; set; }
    public string TypeName => Type.ToString();
    public double TargetTemperature { get; set; }
    public decimal MaxCapacityTon { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
