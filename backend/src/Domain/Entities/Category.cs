using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class Category : BaseEntity, IMustHaveTenant
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? TenantId { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
}
