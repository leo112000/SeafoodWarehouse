using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class LotBatchConfiguration : IEntityTypeConfiguration<LotBatch>
{
    public void Configure(EntityTypeBuilder<LotBatch> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.BatchCode).IsRequired().HasMaxLength(100);
        builder.HasIndex(l => l.BatchCode).IsUnique();
        builder.Property(l => l.InitialQuantity).HasPrecision(18, 3);
        builder.Property(l => l.CurrentQuantity).HasPrecision(18, 3);
        builder.Property(l => l.SupplierName).IsRequired().HasMaxLength(200);
        builder.Property(l => l.CertificateCode).HasMaxLength(100);

        builder.HasOne(l => l.Product)
               .WithMany(p => p.LotBatches)
               .HasForeignKey(l => l.ProductId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(l => !l.IsDeleted);
    }
}
