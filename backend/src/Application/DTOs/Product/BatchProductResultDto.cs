namespace SeafoodWarehouseManagement.Application.DTOs.Product;

public class BatchProductResultDto
{
    public int TotalRequested { get; set; }
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public List<ProductDto> Items { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}
