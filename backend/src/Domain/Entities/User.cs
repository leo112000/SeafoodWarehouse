using SeafoodWarehouseManagement.Domain.Common;

namespace SeafoodWarehouseManagement.Domain.Entities;

public class User : BaseEntity, IMustHaveTenant
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
    public int? TenantId { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
