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

        builder.HasOne(i => i.Warehouse)
               .WithMany(w => w.InventoryItems)
               .HasForeignKey(i => i.WarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.LotBatch)
               .WithMany(l => l.InventoryItems)
               .HasForeignKey(i => i.LotBatchId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(i => !i.IsDeleted);
    }
}
