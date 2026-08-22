using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(p => p.Code).IsUnique();
        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Unit).IsRequired().HasMaxLength(20);
        builder.Property(p => p.MinimumStock).HasPrecision(18, 3);
        builder.Property(p => p.MaximumStock).HasPrecision(18, 3);
        builder.Property(p => p.ScientificName).HasMaxLength(200);
        builder.Property(p => p.ReferencePrice).HasPrecision(18, 2);
        builder.Property(p => p.StorageType).IsRequired().HasMaxLength(20).HasDefaultValue("FROZEN");
        builder.Property(p => p.Status).IsRequired().HasMaxLength(20).HasDefaultValue("ACTIVE");
        builder.Property(p => p.Description).HasMaxLength(500);

        builder.HasOne(p => p.Category)
               .WithMany(c => c.Products)
               .HasForeignKey(p => p.CategoryId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
