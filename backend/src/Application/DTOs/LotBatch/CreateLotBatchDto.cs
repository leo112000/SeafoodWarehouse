using FluentValidation;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.LotBatch;

public class CreateLotBatchDto
{
    public string BatchCode { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public DateTime ProductionDate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public decimal InitialQuantity { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public QualityGrade Grade { get; set; } = QualityGrade.GradeA;
    public string? CertificateCode { get; set; }
    // Nhập vào kho nào và vị trí nào
    public int WarehouseId { get; set; }
    public string StorageBin { get; set; } = string.Empty;
}

public class CreateLotBatchDtoValidator : AbstractValidator<CreateLotBatchDto>
{
    public CreateLotBatchDtoValidator()
    {
        RuleFor(x => x.BatchCode).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("Sản phẩm là bắt buộc.");
        RuleFor(x => x.ExpirationDate).GreaterThan(x => x.ProductionDate).WithMessage("Hạn sử dụng phải sau ngày sản xuất.");
        RuleFor(x => x.InitialQuantity).GreaterThan(0).WithMessage("Số lượng nhập phải lớn hơn 0.");
        RuleFor(x => x.SupplierName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.WarehouseId).GreaterThan(0).WithMessage("Kho nhập là bắt buộc.");
    }
}
