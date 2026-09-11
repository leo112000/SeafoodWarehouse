namespace SeafoodWarehouseManagement.Application.DTOs.Outbound;

public class CreateOutboundSupplyDto
{
    public string Name { get; set; } = string.Empty;
    public string? PackagingCode { get; set; }
    public string Unit { get; set; } = "Cái";
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } = 0;
    public decimal TotalAmount { get; set; } = 0;
}

public class CreateOutboundRequestDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string Reason { get; set; } = "Bán hàng";
    public string Date { get; set; } = string.Empty;
    public decimal TotalWeightKg { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; } = 0;
    public string? DiscountReason { get; set; }
    public string CreatedBy { get; set; } = "Thủ kho";
    public List<CreateOutboundBatchDto> Batches { get; set; } = new();
    public List<CreateOutboundSupplyDto> Supplies { get; set; } = new();
}

public class CreateOutboundBatchDto
{
    public string BatchCode { get; set; } = string.Empty;
    public string Species { get; set; } = string.Empty;
    public decimal QuantityKg { get; set; }
    public decimal GrossWeight { get; set; }
    public decimal TareWeight { get; set; }
    public string? PackagingCode { get; set; }
    public int PackagingQty { get; set; }
    public string ExpiryDate { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}
