using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    public void Configure(EntityTypeBuilder<InventoryItem> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.StorageBin).HasMaxLength(50);
        builder.Property(i => i.Quantity).HasPrecision(18, 3);

        // 1. Tối ưu tìm kiếm vị trí ô kệ khi xuất kho / kiểm kê hàng
        SqlServerIndexBuilderExtensions.IncludeProperties(
            builder.HasIndex(i => new { i.WarehouseId, i.LotBatchId })
                   .HasDatabaseName("IX_InventoryItems_Warehouse_LotBatch"),
            i => new { i.StorageBin, i.Quantity });

        // 2. Tối ưu lọc tồn kho theo chi nhánh (Multi-tenancy)
        builder.HasIndex(i => new { i.TenantId, i.WarehouseId })
               .HasDatabaseName("IX_InventoryItems_Tenant_Warehouse");



        builder.HasOne(i => i.Warehouse)
               .WithMany(w => w.InventoryItems)
               .HasForeignKey(i => i.WarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.LotBatch)
               .WithMany(l => l.InventoryItems)
               .HasForeignKey(i => i.LotBatchId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
