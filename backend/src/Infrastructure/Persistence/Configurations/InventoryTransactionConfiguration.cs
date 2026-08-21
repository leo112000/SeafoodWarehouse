using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.ReferenceNumber).IsRequired().HasMaxLength(100);
        builder.Property(t => t.Quantity).HasPrecision(18, 3);
        builder.Property(t => t.CreatedBy).HasMaxLength(100);
        builder.Property(t => t.Note).HasMaxLength(500);

        builder.HasOne(t => t.LotBatch)
               .WithMany(l => l.Transactions)
               .HasForeignKey(t => t.LotBatchId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.SourceWarehouse)
               .WithMany()
               .HasForeignKey(t => t.SourceWarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.DestinationWarehouse)
               .WithMany()
               .HasForeignKey(t => t.DestinationWarehouseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(t => !t.IsDeleted);
    }
}
