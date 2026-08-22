using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class PackagingReturn : BaseEntity, IMustHaveTenant
{
    public int PackagingLoanId { get; set; }
    public PackagingLoan PackagingLoan { get; set; } = null!;

    public int ReturnedQty { get; set; }
    public DateTime ReturnDate { get; set; } = DateTime.UtcNow;
    public string RecordedBy { get; set; } = "Hệ thống";
    public string? Note { get; set; }
    public int? TenantId { get; set; }
}
