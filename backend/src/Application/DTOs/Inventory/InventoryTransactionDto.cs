using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.Inventory;

public class InventoryTransactionDto
{
    public int Id { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public string TypeName => Type.ToString();
    public int LotBatchId { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string SourceWarehouseName { get; set; } = string.Empty;
    public string? DestinationWarehouseName { get; set; }
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? Note { get; set; }
}
