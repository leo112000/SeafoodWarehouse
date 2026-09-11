namespace SeafoodWarehouseManagement.Application.DTOs.Inbound;

public class CreateInboundRequestDto
{
    public string Supplier { get; set; } = string.Empty;
    public string InboundDate { get; set; } = string.Empty;
    public string StorageLocation { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public List<CreateInboundItemDto> Items { get; set; } = new();
}

public class CreateInboundItemDto
{
    public string SeafoodCode { get; set; } = string.Empty;
    public string SeafoodName { get; set; } = string.Empty;
    public decimal TotalWeight { get; set; } // Cân thô (Gross weight)
    public decimal TareWeight { get; set; } // Số cân bì/khay (Tare weight)
    public decimal NetWeight { get; set; } // Khối lượng thực (Net weight)
    public string? PackagingCode { get; set; }
    public int PackagingQty { get; set; }
    public string StorageCondition { get; set; } = "Cấp đông";
    public string CatchDate { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string BatchCode { get; set; } = string.Empty;
}

public class CancelTransactionRequestDto
{
    public string Reason { get; set; } = string.Empty;
}
