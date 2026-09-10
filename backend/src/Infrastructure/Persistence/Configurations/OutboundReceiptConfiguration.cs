using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class OutboundReceiptConfiguration : IEntityTypeConfiguration<OutboundReceipt>
{
    public void Configure(EntityTypeBuilder<OutboundReceipt> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.ReferenceNumber).IsRequired().HasMaxLength(100);
        builder.HasIndex(r => r.ReferenceNumber).IsUnique().HasDatabaseName("IX_OutboundReceipts_ReferenceNumber");
        builder.HasIndex(r => new { r.TenantId, r.CreatedAt }).HasDatabaseName("IX_OutboundReceipts_Tenant_CreatedAt");

        builder.Property(r => r.CustomerName).IsRequired().HasMaxLength(200);

        builder.Property(r => r.Reason).HasMaxLength(200);
        builder.Property(r => r.CreatedBy).HasMaxLength(100);
        builder.Property(r => r.DiscountReason).HasMaxLength(200);

        builder.Property(r => r.TotalWeightKg).HasPrecision(18, 3);
        builder.Property(r => r.SubTotal).HasPrecision(18, 2);
        builder.Property(r => r.SuppliesTotal).HasPrecision(18, 2);
        builder.Property(r => r.DiscountAmount).HasPrecision(18, 2);
        builder.Property(r => r.TotalAmount).HasPrecision(18, 2);

        builder.HasMany(r => r.Supplies)
               .WithOne(s => s.OutboundReceipt)
               .HasForeignKey(s => s.OutboundReceiptId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
