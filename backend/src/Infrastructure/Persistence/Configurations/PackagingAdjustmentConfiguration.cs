using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class PackagingAdjustmentConfiguration : IEntityTypeConfiguration<PackagingAdjustment>
{
    public void Configure(EntityTypeBuilder<PackagingAdjustment> builder)
    {
        builder.ToTable("PackagingAdjustments");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.AdjustmentType)
               .HasMaxLength(50)
               .IsRequired();

        builder.Property(e => e.Reason)
               .HasMaxLength(500);

        builder.Property(e => e.AdjustedBy)
               .HasMaxLength(100);

        builder.HasOne(e => e.Packaging)
               .WithMany(p => p.Adjustments)
               .HasForeignKey(e => e.PackagingId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.TenantId, e.PackagingId, e.AdjustedAt })
               .HasDatabaseName("IX_PackagingAdjustments_Tenant_Packaging_Date");
    }
}
