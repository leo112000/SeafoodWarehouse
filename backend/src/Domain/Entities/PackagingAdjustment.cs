using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class PackagingAdjustment : BaseEntity, IMustHaveTenant
{
    public int PackagingId { get; set; }
    public Packaging Packaging { get; set; } = null!;

    public string AdjustmentType { get; set; } = "ADD"; // "ADD" (Nhập thêm), "LOSS" (Báo hỏng / mất), "CORRECTION" (Cân đối)
    public int Quantity { get; set; } // Số lượng thay đổi (giá trị tuyệt đối hoặc có dấu)
    public int BeforeStock { get; set; } // Tồn kho trước khi điều chỉnh
    public int AfterStock { get; set; } // Tồn kho sau khi điều chỉnh
    public string? Reason { get; set; } // Lý do (vỡ hỏng, thất lạc, nhập lô mới...)
    public string? AdjustedBy { get; set; } // Người thực hiện
    public DateTime AdjustedAt { get; set; } = DateTime.UtcNow;

    public int? TenantId { get; set; }
}
