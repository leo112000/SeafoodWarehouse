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
        builder.HasIndex(l => l.BatchCode);
        builder.Property(l => l.InitialQuantity).HasPrecision(18, 3);
        builder.Property(l => l.CurrentQuantity).HasPrecision(18, 3);
        builder.Property(l => l.SupplierName).IsRequired().HasMaxLength(200);
        builder.Property(l => l.CertificateCode).HasMaxLength(100);

        // 1. Filtered Index tối ưu thuật toán xuất kho FEFO (Chỉ index các lô CÒN HÀNG và chưa xóa)
        SqlServerIndexBuilderExtensions.IncludeProperties(
            builder.HasIndex(l => new { l.ProductId, l.ExpirationDate })
                   .HasFilter("[CurrentQuantity] > 0 AND [IsDeleted] = 0")
                   .HasDatabaseName("IX_LotBatches_FEFO"),
            l => new { l.BatchCode, l.CurrentQuantity });

        // 2. Index tìm kiếm nhanh lô hàng theo Tenant và mã vạch Barcode
        builder.HasIndex(l => new { l.TenantId, l.BatchCode })
               .HasDatabaseName("IX_LotBatches_Tenant_BatchCode");


        builder.HasOne(l => l.Product)
               .WithMany(p => p.LotBatches)
               .HasForeignKey(l => l.ProductId)
               .OnDelete(DeleteBehavior.Restrict);
    }

}
