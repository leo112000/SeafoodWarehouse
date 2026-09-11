using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Category> Categories { get; }
    DbSet<Product> Products { get; }
    DbSet<Warehouse> Warehouses { get; }
    DbSet<LotBatch> LotBatches { get; }
    DbSet<InventoryItem> InventoryItems { get; }
    DbSet<InventoryTransaction> InventoryTransactions { get; }
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<Packaging> Packagings { get; }
    DbSet<PackagingLoan> PackagingLoans { get; }
    DbSet<PackagingReturn> PackagingReturns { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<SystemSetting> Settings { get; }
    DbSet<Tenant> Tenants { get; }
    DbSet<Partner> Partners { get; }
    DbSet<AppNotification> AppNotifications { get; }
    DbSet<UserNotification> UserNotifications { get; }
    DbSet<OutboundReceipt> OutboundReceipts { get; }
    DbSet<OutboundSupply> OutboundSupplies { get; }

    Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
