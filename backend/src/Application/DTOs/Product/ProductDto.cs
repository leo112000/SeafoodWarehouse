using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Application.DTOs.Product;

public class ProductDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal MinimumStock { get; set; }
    public decimal MaximumStock { get; set; }
    public double TargetTemperature { get; set; }
    public string? ScientificName { get; set; }
    public decimal ReferencePrice { get; set; }
    public int WarningDaysBeforeExpiry { get; set; }
    public string StorageType { get; set; } = "FROZEN";
    public string Status { get; set; } = "ACTIVE";
    public string? Description { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
