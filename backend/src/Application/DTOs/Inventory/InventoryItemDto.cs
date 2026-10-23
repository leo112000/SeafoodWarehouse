using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.Inventory;

public class InventoryItemDto
{
    public int Id { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int LotBatchId { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string StorageBin { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public DateTime? ProductionDate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public int DaysUntilExpiry => (ExpirationDate - DateTime.UtcNow).Days;
    public QualityGrade Grade { get; set; }
    public string SupplierName { get; set; } = string.Empty;
}
