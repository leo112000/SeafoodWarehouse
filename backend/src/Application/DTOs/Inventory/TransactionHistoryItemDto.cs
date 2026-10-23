using System;
using System.Collections.Generic;

namespace SeafoodWarehouseManagement.Application.DTOs.Inventory;

public class TransactionHistoryQueryParams
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string Type { get; set; } = "ALL"; // "ALL" | "INBOUND" | "OUTBOUND"
    public string Status { get; set; } = "ALL"; // "ALL" | "ACTIVE" | "CANCELLED"
    public string? Search { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class TransactionHistoryDetailItemDto
{
    public string BatchCode { get; set; } = string.Empty;
    public string SeafoodName { get; set; } = string.Empty;
    public string StorageCondition { get; set; } = "Cấp đông";
    public decimal GrossWeight { get; set; }
    public decimal TareWeight { get; set; }
    public decimal NetWeight { get; set; }
    public string? ExpiryDate { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public class TransactionSupplyItemDto
{
    public string Name { get; set; } = string.Empty;
    public string? PackagingCode { get; set; }
    public string Unit { get; set; } = "Cái";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
}

public class TransactionHistoryItemDto
{
    public string Id { get; set; } = string.Empty; // ReferenceNumber
    public string Type { get; set; } = "INBOUND"; // "INBOUND" | "OUTBOUND"
    public string Status { get; set; } = "ACTIVE"; // "ACTIVE" | "CANCELLED"
    public string? CancelledAt { get; set; }
    public string? CancelledBy { get; set; }
    public string? CancelReason { get; set; }
    public bool HasExports { get; set; }
    public bool CanCancel { get; set; } = true;
    public List<string> ExportRefNos { get; set; } = new();

    public string Date { get; set; } = string.Empty;
    public string PartnerName { get; set; } = string.Empty;
    public string PartnerType { get; set; } = "SUPPLIER"; // "SUPPLIER" | "CUSTOMER"
    public string StorageLocation { get; set; } = string.Empty;

    public decimal TotalWeightKg { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal SuppliesTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public string DiscountReason { get; set; } = string.Empty;

    public string CreatedBy { get; set; } = "Thủ kho";
    public List<TransactionHistoryDetailItemDto> Items { get; set; } = new();
    public List<TransactionSupplyItemDto> Supplies { get; set; } = new();
}
