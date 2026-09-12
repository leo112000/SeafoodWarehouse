using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class Packaging : BaseEntity, IMustHaveTenant
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "CONTAINER"; // CONTAINER (Sọt luân chuyển) / CONSUMABLE (Vật tư 1 lần)
    public decimal DefaultTareWeight { get; set; } = 0;
    public string Unit { get; set; } = "Cái";
    public int StockQuantity { get; set; } = 0;
    public string? Note { get; set; }
    public int? TenantId { get; set; }

    public ICollection<PackagingLoan> Loans { get; set; } = new List<PackagingLoan>();
    public ICollection<PackagingAdjustment> Adjustments { get; set; } = new List<PackagingAdjustment>();
}
