using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Domain.Common;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    private readonly ICurrentTenant? _currentTenant;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentTenant? currentTenant = null) : base(options)
    {
        _currentTenant = currentTenant;
    }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<LotBatch> LotBatches => Set<LotBatch>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Packaging> Packagings => Set<Packaging>();
    public DbSet<PackagingLoan> PackagingLoans => Set<PackagingLoan>();
    public DbSet<PackagingReturn> PackagingReturns => Set<PackagingReturn>();
    public DbSet<PackagingAdjustment> PackagingAdjustments => Set<PackagingAdjustment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<SystemSetting> Settings => Set<SystemSetting>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<AppNotification> AppNotifications => Set<AppNotification>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<OutboundReceipt> OutboundReceipts => Set<OutboundReceipt>();
    public DbSet<OutboundSupply> OutboundSupplies => Set<OutboundSupply>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentTenantId = _currentTenant?.Id;

        foreach (var entry in ChangeTracker.Entries<IMustHaveTenant>())
        {
            if (entry.State == EntityState.Added && currentTenantId.HasValue)
            {
                if (!entry.Entity.TenantId.HasValue || entry.Entity.TenantId == 0)
                {
                    entry.Entity.TenantId = currentTenantId.Value;
                }
            }
        }

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
            {
                foreach (var property in entry.Properties)
                {
                    if (property.CurrentValue is DateTime dt && dt.Kind == DateTimeKind.Unspecified)
                    {
                        property.CurrentValue = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                    }
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Apply Global Query Filters automatically for Soft Delete & Multi-tenancy
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            if (typeof(BaseEntity).IsAssignableFrom(clrType))
            {
                var parameter = Expression.Parameter(clrType, "e");

                // Filter: !e.IsDeleted
                var isDeletedProperty = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                Expression filterExpr = Expression.Equal(isDeletedProperty, Expression.Constant(false));

                // Filter: TenantId == _currentTenant.Id || _currentTenant.Id == null || e.TenantId == null
                if (typeof(IMustHaveTenant).IsAssignableFrom(clrType))
                {
                    var tenantIdProperty = Expression.Property(parameter, nameof(IMustHaveTenant.TenantId));

                    // Expression accessing _currentTenant.Id dynamically per query
                    Expression<Func<int?>> currentTenantIdAccessor = () => _currentTenant != null ? _currentTenant.Id : null;
                    var currentTenantIdExpr = currentTenantIdAccessor.Body;

                    // _currentTenant.Id == null
                    var currentTenantIsNull = Expression.Equal(currentTenantIdExpr, Expression.Constant(null, typeof(int?)));

                    // e.TenantId == _currentTenant.Id
                    var tenantIdMatches = Expression.Equal(tenantIdProperty, currentTenantIdExpr);

                    // (e.TenantId == _currentTenant.Id || _currentTenant.Id == null)
                    var tenantFilter = Expression.OrElse(tenantIdMatches, currentTenantIsNull);

                    filterExpr = Expression.AndAlso(filterExpr, tenantFilter);
                }

                var lambda = Expression.Lambda(filterExpr, parameter);
                modelBuilder.Entity(clrType).HasQueryFilter(lambda);
            }
        }
    }
}

