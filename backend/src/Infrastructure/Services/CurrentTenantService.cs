using SeafoodWarehouseManagement.Application.Common.Interfaces;

namespace SeafoodWarehouseManagement.Infrastructure.Services;

public class CurrentTenantService : ICurrentTenant
{
    public int? Id { get; private set; }
    public string? Code { get; private set; }
    public string? Name { get; private set; }

    public void SetTenant(int? id, string? code, string? name)
    {
        Id = id;
        Code = code;
        Name = name;
    }
}
