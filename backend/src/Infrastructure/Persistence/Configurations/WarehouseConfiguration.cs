using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class WarehouseConfiguration : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> builder)
    {
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(w => w.Code).IsUnique();
        builder.Property(w => w.Name).IsRequired().HasMaxLength(150);
        builder.Property(w => w.Location).IsRequired().HasMaxLength(250);
        builder.Property(w => w.MaxCapacityTon).HasPrecision(18, 3);
    }
}
