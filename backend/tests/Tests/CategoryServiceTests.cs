using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Tests;

public class CategoryServiceTests
{
    [Fact]
    public void Category_Initialization_ShouldSetDefaultsCorrectly()
    {
        // Arrange & Act
        var category = new Category
        {
            Code = "CAT-001",
            Name = "Tôm",
            Description = "Các loại tôm"
        };

        // Assert
        Assert.Equal("CAT-001", category.Code);
        Assert.Equal("Tôm", category.Name);
        Assert.Equal("Các loại tôm", category.Description);
        Assert.False(category.IsDeleted);
        Assert.Empty(category.Products);
    }

    [Fact]
    public void Product_DefaultUnit_ShouldBeKg()
    {
        // Arrange & Act
        var product = new Product
        {
            Code = "PRD-001",
            Name = "Tôm Thẻ"
        };

        // Assert
        Assert.Equal("kg", product.Unit);
    }
}