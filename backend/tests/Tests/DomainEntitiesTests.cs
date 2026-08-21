using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Tests;

public class DomainEntitiesTests
{
    [Fact]
    public void Product_Initialization_ShouldSetDefaultsCorrectly()
    {
        // Arrange & Act
        var product = new Product
        {
            Code = "SHR-001",
            Name = "Tôm Thẻ Chân Trắng",
            Unit = "kg",
            TargetTemperature = -18.0,
            MinimumStock = 500
        };

        // Assert
        Assert.Equal("SHR-001", product.Code);
        Assert.Equal("Tôm Thẻ Chân Trắng", product.Name);
        Assert.Equal("kg", product.Unit);
        Assert.Equal(-18.0, product.TargetTemperature);
        Assert.False(product.IsDeleted);
    }

    [Fact]
    public void Warehouse_Initialization_ShouldDefaultToFrozenStorage()
    {
        // Arrange & Act
        var warehouse = new Warehouse
        {
            Code = "WH-COLD-01",
            Name = "Kho Đông Hải Phòng",
            Location = "Cảng Đình Vũ",
            MaxCapacityTon = 1000
        };

        // Assert
        Assert.Equal(StorageType.FrozenStorage, warehouse.Type);
        Assert.True(warehouse.IsActive);
    }
}
