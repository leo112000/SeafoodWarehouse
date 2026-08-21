using FluentValidation;

namespace SeafoodWarehouseManagement.Application.DTOs.Category;

public class CreateCategoryDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateCategoryDtoValidator : AbstractValidator<CreateCategoryDto>
{
    public CreateCategoryDtoValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50).WithMessage("Mã danh mục không được để trống và tối đa 50 ký tự.");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150).WithMessage("Tên danh mục không được để trống và tối đa 150 ký tự.");
        RuleFor(x => x.Description).MaximumLength(500).When(x => x.Description != null);
    }
}
