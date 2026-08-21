using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class RolePermission : BaseEntity
{
    public int RoleId { get; set; }
    public string PermissionCode { get; set; } = string.Empty; // VD: Pages.Products.Create, Pages.Inbound.Delete
    public Role? Role { get; set; }
}
