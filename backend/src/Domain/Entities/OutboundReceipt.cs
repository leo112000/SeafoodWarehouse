using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class OutboundReceipt : BaseEntity, IMustHaveTenant
{
    public string ReferenceNumber { get; set; } = string.Empty; // Mã phiếu xuất (PXK-yyyyMMddHHmmss-XX)
    public string CustomerName { get; set; } = string.Empty;    // Khách hàng / Đại lý nhận
    public string Reason { get; set; } = "Bán hàng";            // Lý do xuất (Bán hàng, Chuyển kho...)
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow; // Ngày giờ xuất kho
    public string CreatedBy { get; set; } = "Thủ kho";          // Người lập phiếu

    public decimal TotalWeightKg { get; set; } = 0;             // Tổng khối lượng tịnh hải sản (kg)
    public decimal SubTotal { get; set; } = 0;                  // Tiền hàng hải sản (VNĐ)
    public decimal SuppliesTotal { get; set; } = 0;             // Tiền vật phẩm bán kèm (Thùng xốp, đá gel...) (VNĐ)
    public decimal DiscountAmount { get; set; } = 0;            // Tiền chiết khấu / Giảm giá (VNĐ)
    public string? DiscountReason { get; set; }                 // Mã voucher / Lý do giảm giá
    public decimal TotalAmount { get; set; } = 0;               // Tổng thanh toán thực tế = SubTotal + SuppliesTotal - DiscountAmount

    public string? Note { get; set; }
    public int? TenantId { get; set; }

    public ICollection<OutboundSupply> Supplies { get; set; } = new List<OutboundSupply>();
}
