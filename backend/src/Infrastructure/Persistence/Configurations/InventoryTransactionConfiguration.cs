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

        // 1. Append-Only Sequential Index: Tối ưu tải trang Lịch sử giao dịch mới nhất (không bị Page Split)
        SqlServerIndexBuilderExtensions.IncludeProperties(
            builder.HasIndex(t => new { t.TenantId, t.CreatedAt })
                   .HasDatabaseName("IX_InventoryTransactions_Tenant_CreatedAt"),
            t => new { t.Type, t.Quantity, t.ReferenceNumber });

        // 2. Traceability Index: Phục vụ truy vết nguồn gốc dòng hàng của từng lô
        builder.HasIndex(t => new { t.LotBatchId, t.Type })
               .HasDatabaseName("IX_InventoryTransactions_LotBatch_Type");


        // 3. Index tra cứu theo số phiếu giao dịch
        builder.HasIndex(t => t.ReferenceNumber)
               .HasDatabaseName("IX_InventoryTransactions_ReferenceNumber");


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
    }
}
