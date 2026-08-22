namespace SeafoodWarehouseManagement.Domain.Common;

public interface IMustHaveTenant
{
    public int? TenantId { get; set; }
}
