using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence.Configurations;

public class PackagingLoanConfiguration : IEntityTypeConfiguration<PackagingLoan>
{
    public void Configure(EntityTypeBuilder<PackagingLoan> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.PartnerName).IsRequired().HasMaxLength(200);
        builder.Property(l => l.PartnerType).IsRequired().HasMaxLength(50);
        builder.Property(l => l.Note).HasMaxLength(500);

        // 1. Tối ưu tìm kiếm công nợ sọt theo đối tác và chi nhánh
        builder.HasIndex(l => new { l.TenantId, l.PartnerName, l.PackagingId })
               .HasDatabaseName("IX_PackagingLoans_Tenant_Partner_Packaging");

        // 2. Tối ưu lịch sử cho mượn sọt theo ngày
        builder.HasIndex(l => new { l.TenantId, l.LoanDate })
               .HasDatabaseName("IX_PackagingLoans_Tenant_LoanDate");

        builder.HasOne(l => l.Packaging)
               .WithMany(p => p.Loans)
               .HasForeignKey(l => l.PackagingId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}

