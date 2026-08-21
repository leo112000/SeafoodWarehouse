using FluentValidation;

namespace SeafoodWarehouseManagement.Application.DTOs.Product;

public class UpdateProductDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Unit { get; set; } = "kg";
    public decimal MinimumStock { get; set; }
    public decimal MaximumStock { get; set; }
    public double TargetTemperature { get; set; }
    public string? ScientificName { get; set; }
    public decimal ReferencePrice { get; set; }
    public int WarningDaysBeforeExpiry { get; set; } = 3;
    public string StorageType { get; set; } = "FROZEN";
    public string Status { get; set; } = "ACTIVE";
    public string? Description { get; set; }
    public int CategoryId { get; set; }
}

public class UpdateProductDtoValidator : AbstractValidator<UpdateProductDto>
{
    public UpdateProductDtoValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.MinimumStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaximumStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TargetTemperature).InclusiveBetween(-80, 30);
        RuleFor(x => x.ReferencePrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.WarningDaysBeforeExpiry).GreaterThanOrEqualTo(0);
        RuleFor(x => x.StorageType).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Status).NotEmpty().MaximumLength(20);
        RuleFor(x => x.CategoryId).GreaterThan(0);
    }
}
