using FluentValidation;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.Warehouse;

public class UpdateWarehouseDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public StorageType Type { get; set; }
    public double TargetTemperature { get; set; }
    public decimal MaxCapacityTon { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}

public class UpdateWarehouseDtoValidator : AbstractValidator<UpdateWarehouseDto>
{
    public UpdateWarehouseDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Vui lòng nhập tên kho.").MaximumLength(150);
        RuleFor(x => x.Code).MaximumLength(50);
        RuleFor(x => x.Location).MaximumLength(250);
    }
}
