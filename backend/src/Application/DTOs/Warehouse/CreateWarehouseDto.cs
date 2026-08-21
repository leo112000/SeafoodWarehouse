using FluentValidation;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.Warehouse;

public class CreateWarehouseDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public StorageType Type { get; set; } = StorageType.FrozenStorage;
    public double TargetTemperature { get; set; } = -18.0;
    public decimal MaxCapacityTon { get; set; }
}

public class CreateWarehouseDtoValidator : AbstractValidator<CreateWarehouseDto>
{
    public CreateWarehouseDtoValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Location).NotEmpty().MaximumLength(250);
        RuleFor(x => x.MaxCapacityTon).GreaterThan(0).WithMessage("Sức chứa phải lớn hơn 0 tấn.");
        RuleFor(x => x.TargetTemperature).InclusiveBetween(-80, 30);
    }
}
