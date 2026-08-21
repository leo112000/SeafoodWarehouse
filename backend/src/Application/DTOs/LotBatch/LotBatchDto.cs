using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Application.DTOs.LotBatch;

public class LotBatchDto
{
    public int Id { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public DateTime ProductionDate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public int DaysUntilExpiry => (ExpirationDate - DateTime.UtcNow).Days;
    public decimal InitialQuantity { get; set; }
    public decimal CurrentQuantity { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public QualityGrade Grade { get; set; }
    public string GradeName => Grade.ToString();
    public string? CertificateCode { get; set; }
    public DateTime CreatedAt { get; set; }
}
