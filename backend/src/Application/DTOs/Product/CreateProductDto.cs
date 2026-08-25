using FluentValidation;

namespace SeafoodWarehouseManagement.Application.DTOs.Product;

public class CreateProductDto
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

public class CreateProductDtoValidator : AbstractValidator<CreateProductDto>
{
    public CreateProductDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200).WithMessage("Tên sản phẩm không được để trống.");
        RuleFor(x => x.Code).MaximumLength(50);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.MinimumStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaximumStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TargetTemperature).InclusiveBetween(-80, 30).WithMessage("Nhiệt độ bảo quản phải trong khoảng -80°C đến 30°C.");
        RuleFor(x => x.ReferencePrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.WarningDaysBeforeExpiry).GreaterThanOrEqualTo(0);
        RuleFor(x => x.StorageType).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Status).NotEmpty().MaximumLength(20);
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Danh mục sản phẩm là bắt buộc.");
    }
}
