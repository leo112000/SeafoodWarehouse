using FluentValidation;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.Inventory;

public class CreateTransactionDto
{
    public TransactionType Type { get; set; }
    public int LotBatchId { get; set; }
    public int SourceWarehouseId { get; set; }
    public int? DestinationWarehouseId { get; set; } // Chỉ dùng khi chuyển kho
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
    public string CreatedBy { get; set; } = "System";
}

public class CreateTransactionDtoValidator : AbstractValidator<CreateTransactionDto>
{
    public CreateTransactionDtoValidator()
    {
        RuleFor(x => x.LotBatchId).GreaterThan(0).WithMessage("Lô hàng là bắt buộc.");
        RuleFor(x => x.SourceWarehouseId).GreaterThan(0).WithMessage("Kho nguồn là bắt buộc.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");
        RuleFor(x => x.DestinationWarehouseId)
            .GreaterThan(0).When(x => x.Type == TransactionType.Transfer)
            .WithMessage("Kho đích là bắt buộc khi chuyển kho.");
        RuleFor(x => x.DestinationWarehouseId)
            .NotEqual(x => x.SourceWarehouseId).When(x => x.Type == TransactionType.Transfer)
            .WithMessage("Kho nguồn và kho đích không được giống nhau.");
    }
}
