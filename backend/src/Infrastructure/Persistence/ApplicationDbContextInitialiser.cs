using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Domain.Entities;
using SeafoodWarehouseManagement.Domain.Enums;

namespace SeafoodWarehouseManagement.Infrastructure.Persistence;

public class ApplicationDbContextInitialiser
{
    private readonly ApplicationDbContext _context;

    public ApplicationDbContextInitialiser(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            await _context.Database.EnsureCreatedAsync();
        }
        catch
        {
            // Ignore if database already exists
        }

        // Run DDL migrations independently
        string[] ddlStatements = new[]
        {
            @"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Settings')
              BEGIN
                  CREATE TABLE [Settings] (
                      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                      [ExpiringAlertDays] INT NOT NULL DEFAULT 15,
                      [TempDeviationThreshold] FLOAT NOT NULL DEFAULT 3.0,
                      [DefaultSeafoodPrice] DECIMAL(18,2) NOT NULL DEFAULT 250000,
                      [AutoRefreshIntervalSeconds] INT NOT NULL DEFAULT 30,
                      [LowStockWarningPercent] FLOAT NOT NULL DEFAULT 100.0,
                      [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [UpdatedAt] DATETIME2 NULL,
                      [IsDeleted] BIT NOT NULL DEFAULT 0
                  );
              END",

            @"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tenants')
              BEGIN
                  CREATE TABLE [Tenants] (
                      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                      [Code] NVARCHAR(50) NOT NULL,
                      [Name] NVARCHAR(200) NOT NULL,
                      [Address] NVARCHAR(500) NULL,
                      [Phone] NVARCHAR(50) NULL,
                      [Email] NVARCHAR(100) NULL,
                      [TaxCode] NVARCHAR(50) NULL,
                      [LogoUrl] NVARCHAR(500) NULL,
                      [IsActive] BIT NOT NULL DEFAULT 1,
                      [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [CreatedBy] NVARCHAR(100) NULL,
                      [UpdatedAt] DATETIME2 NULL,
                      [UpdatedBy] NVARCHAR(100) NULL,
                      [IsDeleted] BIT NOT NULL DEFAULT 0
                  );
              END",

            @"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AppNotifications')
              BEGIN
                  CREATE TABLE [AppNotifications] (
                      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                      [NotificationName] NVARCHAR(100) NOT NULL,
                      [Title] NVARCHAR(200) NOT NULL,
                      [Message] NVARCHAR(MAX) NOT NULL,
                      [Severity] NVARCHAR(50) NOT NULL DEFAULT 'info',
                      [Link] NVARCHAR(500) NULL,
                      [DataJson] NVARCHAR(MAX) NULL,
                      [TenantId] INT NULL,
                      [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [UpdatedAt] DATETIME2 NULL,
                      [IsDeleted] BIT NOT NULL DEFAULT 0
                  );
              END",

            @"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserNotifications')
              BEGIN
                  CREATE TABLE [UserNotifications] (
                      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                      [UserId] INT NOT NULL,
                      [NotificationId] INT NOT NULL,
                      [State] INT NOT NULL DEFAULT 0,
                      [ReadAt] DATETIME2 NULL,
                      [TenantId] INT NULL,
                      [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [UpdatedAt] DATETIME2 NULL,
                      [IsDeleted] BIT NOT NULL DEFAULT 0
                  );
              END",

            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'TenantId') ALTER TABLE [Users] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Roles') AND name = 'TenantId') ALTER TABLE [Roles] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Warehouses') AND name = 'TenantId') ALTER TABLE [Warehouses] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'TenantId') ALTER TABLE [Products] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Categories') AND name = 'TenantId') ALTER TABLE [Categories] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LotBatches') AND name = 'TenantId') ALTER TABLE [LotBatches] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryItems') AND name = 'TenantId') ALTER TABLE [InventoryItems] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'TenantId') ALTER TABLE [InventoryTransactions] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Packagings') AND name = 'TenantId') ALTER TABLE [Packagings] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PackagingLoans') AND name = 'TenantId') ALTER TABLE [PackagingLoans] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PackagingReturns') AND name = 'TenantId') ALTER TABLE [PackagingReturns] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'TenantId') ALTER TABLE [AuditLogs] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Settings') AND name = 'TenantId') ALTER TABLE [Settings] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'UnitPrice') ALTER TABLE [InventoryTransactions] ADD [UnitPrice] DECIMAL(18,2) NOT NULL DEFAULT 0;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'TotalAmount') ALTER TABLE [InventoryTransactions] ADD [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'TareWeight') ALTER TABLE [InventoryTransactions] ADD [TareWeight] DECIMAL(18,2) NOT NULL DEFAULT 0;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'GrossWeight') ALTER TABLE [InventoryTransactions] ADD [GrossWeight] DECIMAL(18,2) NOT NULL DEFAULT 0;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'PackagingCode') ALTER TABLE [InventoryTransactions] ADD [PackagingCode] NVARCHAR(50) NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'PackagingQty') ALTER TABLE [InventoryTransactions] ADD [PackagingQty] INT NOT NULL DEFAULT 0;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LotBatches') AND name = 'TareWeight') ALTER TABLE [LotBatches] ADD [TareWeight] DECIMAL(18,2) NOT NULL DEFAULT 0;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LotBatches') AND name = 'PackagingCode') ALTER TABLE [LotBatches] ADD [PackagingCode] NVARCHAR(50) NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LotBatches') AND name = 'PackagingQty') ALTER TABLE [LotBatches] ADD [PackagingQty] INT NOT NULL DEFAULT 0;"
        };

        foreach (var statement in ddlStatements)
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync(statement);
            }
            catch
            {
                // Continue executing remaining DDL statements
            }
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch
        {
            // Handled
        }
    }

    private async Task TrySeedAsync()
    {
        // -1. Seed Cửa hàng / Tenant mặc định (Chỉ tạo lần đầu khi DB hoàn toàn trống)
        if (!await _context.Tenants.IgnoreQueryFilters().AnyAsync())
        {
            _context.Tenants.Add(new Tenant
            {
                Code = "BIENDONG",
                Name = "KHO HẢI SẢN BIỂN ĐÔNG",
                Address = "123 Đường Cảng Cá, Phường Thọ Quang, Đà Nẵng",
                Phone = "0236 123 4567",
                Email = "kho@biendongsea.vn",
                TaxCode = "0401 345 678",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }
        var defaultTenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Code == "BIENDONG");
        int? defaultTenantId = defaultTenant?.Id;

        // 0. Seed Cấu hình Hệ thống (Settings)
        if (!await _context.Settings.AnyAsync())
        {
            _context.Settings.Add(new SystemSetting
            {
                ExpiringAlertDays = 15,
                TempDeviationThreshold = 3.0,
                DefaultSeafoodPrice = 250000,
                AutoRefreshIntervalSeconds = 30,
                LowStockWarningPercent = 100.0,
                TenantId = defaultTenantId
            });
            await _context.SaveChangesAsync();
        }

        // 1. Seed Danh mục Hải sản (Categories)
        if (!await _context.Categories.AnyAsync())
        {
            var categories = new List<Category>
            {
                new() { Code = "CA", Name = "Cá tươi & Cấp đông", Description = "Cá thu, cá hồi, cá basa, cá ngừ" },
                new() { Code = "TOM", Name = "Tôm hải sản", Description = "Tôm hùm bông, tôm sú, tôm thẻ chân trắng" },
                new() { Code = "CUA", Name = "Cua & Ghẹ", Description = "Cua hoàng đế, cua gạch, ghẹ xanh" },
                new() { Code = "MUC", Name = "Mực & Bạch tuộc", Description = "Mực lá đại, mực ống, bạch tuộc đại" },
                new() { Code = "HAU", Name = "Hàu & Nhuyễn thể", Description = "Hàu đại dương, ngao hai vòi, sò huyết" },
            };
            _context.Categories.AddRange(categories);
            await _context.SaveChangesAsync();
        }

        // 2. Seed Sản phẩm Hải sản (Products)
        if (!await _context.Products.AnyAsync())
        {
            var caCat = await _context.Categories.FirstOrDefaultAsync(c => c.Code == "CA");
            var tomCat = await _context.Categories.FirstOrDefaultAsync(c => c.Code == "TOM");

            if (caCat != null && tomCat != null)
            {
                var products = new List<Product>
                {
                    
                };
                _context.Products.AddRange(products);
                await _context.SaveChangesAsync();
            }
        }

        // 3. Seed Bao bì (Packagings)
        if (!await _context.Packagings.AnyAsync())
        {
            var packagings = new List<Packaging>
            {
                new() { Code = "SOT-RED", Name = "Sọt nhựa đỏ tiêu chuẩn", Category = "CONTAINER", DefaultTareWeight = 1.8m, Unit = "Cái", StockQuantity = 250 },
                new() { Code = "SOT-BLUE", Name = "Sọt nhựa xanh dương lớn", Category = "CONTAINER", DefaultTareWeight = 2.2m, Unit = "Cái", StockQuantity = 180 },
                new() { Code = "THUNG-30KG", Name = "Thùng xốp lớn 30kg", Category = "CONSUMABLE", DefaultTareWeight = 0.5m, Unit = "Cái", StockQuantity = 500 },
                new() { Code = "THUNG-10KG", Name = "Thùng carton chống ẩm 10kg", Category = "CONSUMABLE", DefaultTareWeight = 0.3m, Unit = "Cái", StockQuantity = 400 },
            };
            _context.Packagings.AddRange(packagings);
            await _context.SaveChangesAsync();
        }

        // 4. Seed Vai trò (Roles)
        if (!await _context.Roles.AnyAsync())
        {
            var adminRole = new Role { Name = "Admin", Description = "Quản trị viên toàn quyền hệ thống kho", IsSystemDefault = true };
            var thukhoRole = new Role { Name = "Thukho", Description = "Thủ kho quản lý nhập xuất kho & tồn kho", IsSystemDefault = true };
            var nhanvienRole = new Role { Name = "Nhanvien", Description = "Nhân viên vận hành", IsSystemDefault = true };

            _context.Roles.AddRange(adminRole, thukhoRole, nhanvienRole);
            await _context.SaveChangesAsync();
        }

        // 5. Seed Phân quyền chi tiết (RolePermissions)
        if (!await _context.RolePermissions.AnyAsync())
        {
            var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
            var thukhoRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Thukho");
            var nhanvienRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Nhanvien");

            if (adminRole != null && thukhoRole != null && nhanvienRole != null)
            {
                var adminPerms = new List<string>
                {
                    "Pages.Dashboard.View", "Pages.Products.View", "Pages.Products.Create", "Pages.Products.Edit", "Pages.Products.Delete",
                    "Pages.Packaging.View", "Pages.Packaging.Create", "Pages.Packaging.Edit", "Pages.Packaging.Delete",
                    "Pages.Categories.View", "Pages.Categories.Create", "Pages.Categories.Edit", "Pages.Categories.Delete",
                    "Pages.Warehouses.View", "Pages.Warehouses.Create", "Pages.Warehouses.Edit", "Pages.Warehouses.Delete",
                    "Pages.Inbound.Create", "Pages.Inbound.View", "Pages.Outbound.Create", "Pages.Outbound.View",
                    "Pages.Wastage.Create", "Pages.Wastage.View", "Pages.PackagingReturn.Create", "Pages.PackagingReturn.View",
                    "Pages.Reports.View", "Pages.Alerts.View", "Pages.Users.Manage", "Pages.Roles.Manage", "Pages.Settings.Manage", "Pages.Tenants.Manage", "Pages.AuditLogs.View"
                };

                var thukhoPerms = new List<string>
                {
                    "Pages.Dashboard.View", "Pages.Products.View", "Pages.Packaging.View", "Pages.Categories.View", "Pages.Warehouses.View",
                    "Pages.Inbound.Create", "Pages.Inbound.View", "Pages.Outbound.Create", "Pages.Outbound.View",
                    "Pages.Wastage.Create", "Pages.Wastage.View", "Pages.PackagingReturn.Create", "Pages.PackagingReturn.View",
                    "Pages.Reports.View", "Pages.Alerts.View"
                };

                var nhanvienPerms = new List<string> { "Pages.Dashboard.View", "Pages.Inbound.View", "Pages.Outbound.View" };

                var rolePermissions = new List<RolePermission>();

                foreach (var perm in adminPerms)
                {
                    rolePermissions.Add(new RolePermission { RoleId = adminRole.Id, PermissionCode = perm });
                }
                foreach (var perm in thukhoPerms)
                {
                    rolePermissions.Add(new RolePermission { RoleId = thukhoRole.Id, PermissionCode = perm });
                }
                foreach (var perm in nhanvienPerms)
                {
                    rolePermissions.Add(new RolePermission { RoleId = nhanvienRole.Id, PermissionCode = perm });
                }

                _context.RolePermissions.AddRange(rolePermissions);
                await _context.SaveChangesAsync();
            }
        }

        // 6. Seed Mượn / Trả Bao bì (PackagingLoans & PackagingReturns)
        if (!await _context.PackagingLoans.AnyAsync())
        {
            var sotRed = await _context.Packagings.FirstOrDefaultAsync(p => p.Code == "SOT-RED");
            var sotBlue = await _context.Packagings.FirstOrDefaultAsync(p => p.Code == "SOT-BLUE");

            if (sotRed != null && sotBlue != null)
            {
                var loan1 = new PackagingLoan
                {
                    PartnerName = "Nhà hàng Hải Sản A",
                    PartnerType = "CUSTOMER",
                    PackagingId = sotRed.Id,
                    LoanedQty = 30,
                    ReturnedQty = 12,
                    LoanDate = DateTime.UtcNow.AddDays(-10),
                    Note = "Giao kèm lô tôm hùm PXK-20260812-001"
                };

                var loan2 = new PackagingLoan
                {
                    PartnerName = "Siêu thị WinMart",
                    PartnerType = "CUSTOMER",
                    PackagingId = sotBlue.Id,
                    LoanedQty = 20,
                    ReturnedQty = 5,
                    LoanDate = DateTime.UtcNow.AddDays(-5)
                };

                _context.PackagingLoans.AddRange(loan1, loan2);
                await _context.SaveChangesAsync();

                _context.PackagingReturns.Add(new PackagingReturn
                {
                    PackagingLoanId = loan1.Id,
                    ReturnedQty = 12,
                    ReturnDate = DateTime.UtcNow.AddDays(-2),
                    RecordedBy = "Trần Minh Thuận (Thủ kho)",
                    Note = "Hoàn trả đợt 1"
                });
                await _context.SaveChangesAsync();
            }
        }

        // 7. Seed Nhật ký hệ thống (AuditLogs)
        if (!await _context.AuditLogs.AnyAsync())
        {
            var logs = new List<AuditLog>
            {
                new()
                {
                    Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    UserName = "Đặng Lâm Cường (Admin)",
                    UserRole = "Quản trị viên",
                    Action = "LOGIN",
                    TargetModule = "Xác thực",
                    Details = "Đăng nhập thành công vào hệ thống quản lý kho",
                    IpAddress = "127.0.0.1",
                    Browser = "Chrome 127 / Windows 11",
                    Status = "SUCCESS",
                    ExecutionDurationMs = 110,
                },
                new()
                {
                    Timestamp = DateTime.Now.AddMinutes(-25).ToString("yyyy-MM-dd HH:mm:ss"),
                    UserName = "Nguyễn Văn Thủ Kho",
                    UserRole = "Thủ kho",
                    Action = "CREATE",
                    TargetModule = "Nhập kho",
                    Details = "Tạo mới phiếu nhập kho hải sản PNK-20260820-001 (150kg Tôm hùm)",
                    IpAddress = "192.168.1.15",
                    Browser = "Edge 126 / Windows 10",
                    Status = "SUCCESS",
                    ExecutionDurationMs = 85,
                }
            };
            _context.AuditLogs.AddRange(logs);
            await _context.SaveChangesAsync();
        }
    }
}
