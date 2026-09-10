using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Action).IsRequired().HasMaxLength(100);
        builder.Property(a => a.TargetModule).IsRequired().HasMaxLength(100);
        builder.Property(a => a.UserName).HasMaxLength(200);

        // Tối ưu truy vấn nhật ký kiểm toán mới nhất theo Tenant
        builder.HasIndex(a => new { a.TenantId, a.Timestamp })
               .HasDatabaseName("IX_AuditLogs_Tenant_Timestamp");

    }
}
