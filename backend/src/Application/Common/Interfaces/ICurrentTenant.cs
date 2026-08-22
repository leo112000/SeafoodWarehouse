namespace SeafoodWarehouseManagement.Application.Common.Interfaces;

public interface ICurrentTenant
{
    int? Id { get; }
    string? Code { get; }
    string? Name { get; }
    void SetTenant(int? id, string? code, string? name);
}
