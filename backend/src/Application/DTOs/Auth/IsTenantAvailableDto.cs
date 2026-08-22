namespace SeafoodWarehouseManagement.Application.DTOs.Auth;

public enum TenantAvailabilityState
{
    Available = 1,
    InActive = 2,
    NotFound = 3
}

public class IsTenantAvailableInput
{
    public string? TenancyName { get; set; }
}

public class IsTenantAvailableOutput
{
    public TenantAvailabilityState State { get; set; }
    public int? TenantId { get; set; }
    public string? TenantCode { get; set; }
    public string? TenantName { get; set; }
}
