using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class OutboundSupplyConfiguration : IEntityTypeConfiguration<OutboundSupply>
{
    public void Configure(EntityTypeBuilder<OutboundSupply> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Name).IsRequired().HasMaxLength(200);
        builder.Property(s => s.PackagingCode).HasMaxLength(100);
        builder.Property(s => s.Unit).HasMaxLength(50);

        builder.Property(s => s.UnitPrice).HasPrecision(18, 2);
        builder.Property(s => s.TotalAmount).HasPrecision(18, 2);
    }
}
