using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class OutboundSupply : BaseEntity, IMustHaveTenant
{
    public int OutboundReceiptId { get; set; }
    public OutboundReceipt OutboundReceipt { get; set; } = null!;

    public string Name { get; set; } = string.Empty;       // Tên vật phẩm kèm (Thùng xốp 30kg, Đá gel...)
    public string? PackagingCode { get; set; }             // Mã loại bao bì / thùng xốp nếu có
    public string Unit { get; set; } = "Cái";              // Đơn vị tính (Cái, Thùng, Hộp...)
    public int Quantity { get; set; } = 1;                 // Số lượng
    public decimal UnitPrice { get; set; } = 0;            // Đơn giá bán (VNĐ)
    public decimal TotalAmount { get; set; } = 0;          // Thành tiền = Quantity * UnitPrice (VNĐ)

    public int? TenantId { get; set; }
}
