using SeafoodWarehouseManagement.Domain.Common;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class LotBatch : BaseEntity, IMustHaveTenant
{
    public string BatchCode { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public DateTime ProductionDate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public decimal InitialQuantity { get; set; }
    public decimal CurrentQuantity { get; set; }
    public decimal UnitPrice { get; set; } = 0;  // Đơn giá nhập (VNĐ/kg)
    public string SupplierName { get; set; } = string.Empty;
    public QualityGrade Grade { get; set; } = QualityGrade.GradeA;
    public string? CertificateCode { get; set; } // Chứng nhận kiểm dịch/an toàn thực phẩm

    // Thông tin sọt / bao bì đựng khi nhập lô hàng này
    public decimal TareWeight { get; set; } = 0; // Trọng lượng sọt / bì nhập kho (kg)
    public string? PackagingCode { get; set; } // Mã loại sọt / thùng đựng (SOT-RED, SOT-BLUE, THUNG-30KG...)
    public int PackagingQty { get; set; } = 0; // Số lượng sọt / thùng đựng khi nhập
    public int? TenantId { get; set; }

    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
    public ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
}
