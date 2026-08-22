using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public enum PartnerType
{
    Supplier = 0, // Nhà cung cấp / Tàu cá / Hợp tác xã đánh bắt
    Customer = 1  // Khách hàng / Nhà hàng / Đại lý phân phối
}

/// <summary>
/// Quản lý Đối tác kinh doanh: Nhà cung cấp & Khách hàng
/// </summary>
public class Partner : BaseEntity, IMustHaveTenant
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public PartnerType Type { get; set; } = PartnerType.Supplier;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string TaxCode { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
    public int? TenantId { get; set; }
}
