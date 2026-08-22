using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class PackagingLoan : BaseEntity, IMustHaveTenant
{
    public string PartnerName { get; set; } = string.Empty;
    public string PartnerType { get; set; } = "CUSTOMER"; // CUSTOMER / SUPPLIER
    public int PackagingId { get; set; }
    public Packaging Packaging { get; set; } = null!;

    public int LoanedQty { get; set; }
    public int ReturnedQty { get; set; }
    public DateTime LoanDate { get; set; } = DateTime.UtcNow;
    public string? Note { get; set; }

    public int? TenantId { get; set; }
    public ICollection<PackagingReturn> Returns { get; set; } = new List<PackagingReturn>();
}
