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
            // Tự động sinh bảng trên Supabase / PostgreSQL hoặc SQL Server
            await _context.Database.EnsureCreatedAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Database Init Warning]: {ex.Message}");
        }

        // Nếu là PostgreSQL (Supabase / Npgsql), chạy DDL tạo bảng Postgres chắc chắn 100%
        if (_context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
        {
            string[] pgDdlStatements = new[]
            {
                @"CREATE TABLE IF NOT EXISTS ""Tenants"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Code"" VARCHAR(50) NOT NULL,
                    ""Name"" VARCHAR(200) NOT NULL,
                    ""Address"" VARCHAR(500) NULL,
                    ""Phone"" VARCHAR(50) NULL,
                    ""Email"" VARCHAR(100) NULL,
                    ""TaxCode"" VARCHAR(50) NULL,
                    ""LogoUrl"" VARCHAR(500) NULL,
                    ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
                    ""CreatedBy"" VARCHAR(100) NULL,
                    ""UpdatedBy"" VARCHAR(100) NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""Settings"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""ExpiringAlertDays"" INT NOT NULL DEFAULT 15,
                    ""TempDeviationThreshold"" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
                    ""DefaultSeafoodPrice"" NUMERIC(18,2) NOT NULL DEFAULT 250000,
                    ""AutoRefreshIntervalSeconds"" INT NOT NULL DEFAULT 30,
                    ""LowStockWarningPercent"" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""FullName"" VARCHAR(200) NOT NULL,
                    ""Email"" VARCHAR(100) NOT NULL,
                    ""PasswordHash"" VARCHAR(500) NOT NULL,
                    ""Phone"" VARCHAR(50) NULL,
                    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'Status') THEN 
                        ALTER TABLE ""Users"" ADD COLUMN ""Status"" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'Username') THEN 
                        ALTER TABLE ""Users"" ALTER COLUMN ""Username"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'Role') THEN 
                        ALTER TABLE ""Users"" ALTER COLUMN ""Role"" DROP NOT NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""Roles"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Name"" VARCHAR(100) NOT NULL,
                    ""Description"" VARCHAR(500) NULL,
                    ""IsSystemDefault"" BOOLEAN NOT NULL DEFAULT TRUE,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Roles' AND column_name = 'IsSystemDefault') THEN 
                        ALTER TABLE ""Roles"" ADD COLUMN ""IsSystemDefault"" BOOLEAN NOT NULL DEFAULT TRUE; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""RolePermissions"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""RoleId"" INT NOT NULL,
                    ""PermissionCode"" VARCHAR(100) NOT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RolePermissions' AND column_name = 'PermissionCode') THEN 
                        ALTER TABLE ""RolePermissions"" ADD COLUMN ""PermissionCode"" VARCHAR(100) NOT NULL DEFAULT ''; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RolePermissions' AND column_name = 'PermissionName') THEN 
                        ALTER TABLE ""RolePermissions"" ALTER COLUMN ""PermissionName"" DROP NOT NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""UserRoles"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""UserId"" INT NOT NULL,
                    ""RoleId"" INT NOT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""Categories"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Code"" VARCHAR(50) NOT NULL,
                    ""Name"" VARCHAR(200) NOT NULL,
                    ""Description"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""Products"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""CategoryId"" INT NOT NULL,
                    ""Code"" VARCHAR(50) NOT NULL,
                    ""Name"" VARCHAR(200) NOT NULL,
                    ""ScientificName"" VARCHAR(200) NULL,
                    ""StorageType"" VARCHAR(50) NOT NULL DEFAULT 'FROZEN',
                    ""TargetTemperature"" DOUBLE PRECISION NOT NULL DEFAULT -18.0,
                    ""ReferencePrice"" NUMERIC(18,2) NOT NULL DEFAULT 250000,
                    ""WarningDaysBeforeExpiry"" INT NOT NULL DEFAULT 15,
                    ""MinimumStock"" NUMERIC(18,3) NOT NULL DEFAULT 100.0,
                    ""MaximumStock"" NUMERIC(18,3) NOT NULL DEFAULT 1000.0,
                    ""Unit"" VARCHAR(50) NOT NULL DEFAULT 'kg',
                    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                    ""Description"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Products' AND column_name = 'MaximumStock') THEN 
                        ALTER TABLE ""Products"" ADD COLUMN ""MaximumStock"" NUMERIC(18,3) NOT NULL DEFAULT 1000.0; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""Warehouses"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Code"" VARCHAR(50) NOT NULL,
                    ""Name"" VARCHAR(200) NOT NULL,
                    ""Location"" VARCHAR(500) NOT NULL,
                    ""Type"" INT NOT NULL DEFAULT 0,
                    ""TargetTemperature"" DOUBLE PRECISION NOT NULL DEFAULT -18.0,
                    ""MaxCapacityTon"" NUMERIC(18,2) NOT NULL DEFAULT 100.0,
                    ""Description"" VARCHAR(500) NULL,
                    ""Note"" VARCHAR(500) NULL,
                    ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Warehouses' AND column_name = 'Description') THEN 
                        ALTER TABLE ""Warehouses"" ADD COLUMN ""Description"" VARCHAR(500) NULL; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Warehouses' AND column_name = 'Note') THEN 
                        ALTER TABLE ""Warehouses"" ADD COLUMN ""Note"" VARCHAR(500) NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""LotBatches"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""ProductId"" INT NOT NULL,
                    ""BatchCode"" VARCHAR(100) NOT NULL,
                    ""InitialQuantity"" NUMERIC(18,3) NOT NULL,
                    ""CurrentQuantity"" NUMERIC(18,3) NOT NULL,
                    ""SupplierName"" VARCHAR(200) NULL,
                    ""OriginLocation"" VARCHAR(200) NULL,
                    ""Grade"" INT NOT NULL DEFAULT 0,
                    ""CertificateCode"" VARCHAR(100) NULL,
                    ""ProductionDate"" TIMESTAMP WITH TIME ZONE NOT NULL,
                    ""ExpirationDate"" TIMESTAMP WITH TIME ZONE NOT NULL,
                    ""UnitPrice"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""TareWeight"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""PackagingCode"" VARCHAR(50) NULL,
                    ""PackagingQty"" INT NOT NULL DEFAULT 0,
                    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
                    ""Note"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LotBatches' AND column_name = 'Grade') THEN 
                        ALTER TABLE ""LotBatches"" ADD COLUMN ""Grade"" INT NOT NULL DEFAULT 0; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""InventoryItems"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""WarehouseId"" INT NOT NULL,
                    ""LotBatchId"" INT NOT NULL,
                    ""StorageBin"" VARCHAR(100) NOT NULL DEFAULT '',
                    ""Quantity"" NUMERIC(18,3) NOT NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryItems' AND column_name = 'StorageBin') THEN 
                        ALTER TABLE ""InventoryItems"" ADD COLUMN ""StorageBin"" VARCHAR(100) NOT NULL DEFAULT ''; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryItems' AND column_name = 'Zone') THEN 
                        ALTER TABLE ""InventoryItems"" ALTER COLUMN ""Zone"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryItems' AND column_name = 'Rack') THEN 
                        ALTER TABLE ""InventoryItems"" ALTER COLUMN ""Rack"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryItems' AND column_name = 'Shelf') THEN 
                        ALTER TABLE ""InventoryItems"" ALTER COLUMN ""Shelf"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryItems' AND column_name = 'Position') THEN 
                        ALTER TABLE ""InventoryItems"" ALTER COLUMN ""Position"" DROP NOT NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""InventoryTransactions"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""ReferenceNumber"" VARCHAR(100) NOT NULL,
                    ""Type"" INT NOT NULL,
                    ""LotBatchId"" INT NOT NULL,
                    ""SourceWarehouseId"" INT NOT NULL,
                    ""DestinationWarehouseId"" INT NULL,
                    ""Quantity"" NUMERIC(18,3) NOT NULL,
                    ""TareWeight"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""GrossWeight"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""PackagingCode"" VARCHAR(50) NULL,
                    ""PackagingQty"" INT NOT NULL DEFAULT 0,
                    ""UnitPrice"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""TotalAmount"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""TransactionDate"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""CreatedBy"" VARCHAR(100) NOT NULL DEFAULT 'System',
                    ""Note"" VARCHAR(500) NULL,
                    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                    ""CancelledAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""CancelledBy"" VARCHAR(100) NULL,
                    ""CancelReason"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryTransactions' AND column_name = 'Status') THEN 
                        ALTER TABLE ""InventoryTransactions"" ADD COLUMN ""Status"" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryTransactions' AND column_name = 'CancelledAt') THEN 
                        ALTER TABLE ""InventoryTransactions"" ADD COLUMN ""CancelledAt"" TIMESTAMP WITH TIME ZONE NULL; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryTransactions' AND column_name = 'CancelledBy') THEN 
                        ALTER TABLE ""InventoryTransactions"" ADD COLUMN ""CancelledBy"" VARCHAR(100) NULL; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InventoryTransactions' AND column_name = 'CancelReason') THEN 
                        ALTER TABLE ""InventoryTransactions"" ADD COLUMN ""CancelReason"" VARCHAR(500) NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""OutboundReceipts"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""ReferenceNumber"" VARCHAR(100) NOT NULL,
                    ""CustomerName"" VARCHAR(200) NOT NULL,
                    ""Reason"" VARCHAR(200) NOT NULL DEFAULT 'Bán hàng',
                    ""TransactionDate"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""CreatedBy"" VARCHAR(100) NOT NULL DEFAULT 'Thủ kho',
                    ""TotalWeightKg"" NUMERIC(18,3) NOT NULL DEFAULT 0,
                    ""SubTotal"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""SuppliesTotal"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""DiscountAmount"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""DiscountReason"" VARCHAR(200) NULL,
                    ""TotalAmount"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""Note"" TEXT NULL,
                    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                    ""CancelledAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""CancelledBy"" VARCHAR(100) NULL,
                    ""CancelReason"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OutboundReceipts' AND column_name = 'Status') THEN 
                        ALTER TABLE ""OutboundReceipts"" ADD COLUMN ""Status"" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OutboundReceipts' AND column_name = 'CancelledAt') THEN 
                        ALTER TABLE ""OutboundReceipts"" ADD COLUMN ""CancelledAt"" TIMESTAMP WITH TIME ZONE NULL; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OutboundReceipts' AND column_name = 'CancelledBy') THEN 
                        ALTER TABLE ""OutboundReceipts"" ADD COLUMN ""CancelledBy"" VARCHAR(100) NULL; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OutboundReceipts' AND column_name = 'CancelReason') THEN 
                        ALTER TABLE ""OutboundReceipts"" ADD COLUMN ""CancelReason"" VARCHAR(500) NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""OutboundSupplies"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""OutboundReceiptId"" INT NOT NULL,
                    ""Name"" VARCHAR(200) NOT NULL,
                    ""PackagingCode"" VARCHAR(100) NULL,
                    ""Unit"" VARCHAR(50) NOT NULL DEFAULT 'Cái',
                    ""Quantity"" INT NOT NULL DEFAULT 1,
                    ""UnitPrice"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""TotalAmount"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""Packagings"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Code"" VARCHAR(50) NOT NULL,
                    ""Name"" VARCHAR(200) NOT NULL,
                    ""Category"" VARCHAR(50) NOT NULL DEFAULT 'CONTAINER',
                    ""DefaultTareWeight"" NUMERIC(18,2) NOT NULL DEFAULT 0,
                    ""Unit"" VARCHAR(50) NOT NULL DEFAULT 'Cái',
                    ""StockQuantity"" INT NOT NULL DEFAULT 0,
                    ""Note"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Packagings' AND column_name = 'Type') THEN 
                        ALTER TABLE ""Packagings"" ALTER COLUMN ""Type"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Packagings' AND column_name = 'TareWeightKg') THEN 
                        ALTER TABLE ""Packagings"" ALTER COLUMN ""TareWeightKg"" DROP NOT NULL; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Packagings' AND column_name = 'Category') THEN 
                        ALTER TABLE ""Packagings"" ADD COLUMN ""Category"" VARCHAR(50) NOT NULL DEFAULT 'CONTAINER'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Packagings' AND column_name = 'DefaultTareWeight') THEN 
                        ALTER TABLE ""Packagings"" ADD COLUMN ""DefaultTareWeight"" NUMERIC(18,2) NOT NULL DEFAULT 0; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Packagings' AND column_name = 'Unit') THEN 
                        ALTER TABLE ""Packagings"" ADD COLUMN ""Unit"" VARCHAR(50) NOT NULL DEFAULT 'Cái'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Packagings' AND column_name = 'StockQuantity') THEN 
                        ALTER TABLE ""Packagings"" ADD COLUMN ""StockQuantity"" INT NOT NULL DEFAULT 0; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Packagings' AND column_name = 'Note') THEN 
                        ALTER TABLE ""Packagings"" ADD COLUMN ""Note"" VARCHAR(500) NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""PackagingLoans"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""PartnerName"" VARCHAR(200) NOT NULL DEFAULT '',
                    ""PartnerType"" VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
                    ""PackagingId"" INT NOT NULL,
                    ""LoanedQty"" INT NOT NULL DEFAULT 0,
                    ""ReturnedQty"" INT NOT NULL DEFAULT 0,
                    ""LoanDate"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""Note"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'PartnerName') THEN 
                        ALTER TABLE ""PackagingLoans"" ADD COLUMN ""PartnerName"" VARCHAR(200) NOT NULL DEFAULT ''; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'PartnerType') THEN 
                        ALTER TABLE ""PackagingLoans"" ADD COLUMN ""PartnerType"" VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'LoanedQty') THEN 
                        ALTER TABLE ""PackagingLoans"" ADD COLUMN ""LoanedQty"" INT NOT NULL DEFAULT 0; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'ReturnedQty') THEN 
                        ALTER TABLE ""PackagingLoans"" ADD COLUMN ""ReturnedQty"" INT NOT NULL DEFAULT 0; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'LoanDate') THEN 
                        ALTER TABLE ""PackagingLoans"" ADD COLUMN ""LoanDate"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(); 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'LoanCode') THEN 
                        ALTER TABLE ""PackagingLoans"" ALTER COLUMN ""LoanCode"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'BorrowerName') THEN 
                        ALTER TABLE ""PackagingLoans"" ALTER COLUMN ""BorrowerName"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingLoans' AND column_name = 'QuantityLoaned') THEN 
                        ALTER TABLE ""PackagingLoans"" ALTER COLUMN ""QuantityLoaned"" DROP NOT NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""PackagingReturns"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""PackagingLoanId"" INT NOT NULL DEFAULT 0,
                    ""ReturnedQty"" INT NOT NULL DEFAULT 0,
                    ""ReturnDate"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""RecordedBy"" VARCHAR(100) NOT NULL DEFAULT 'Hệ thống',
                    ""Note"" VARCHAR(500) NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingReturns' AND column_name = 'PackagingLoanId') THEN 
                        ALTER TABLE ""PackagingReturns"" ADD COLUMN ""PackagingLoanId"" INT NOT NULL DEFAULT 0; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingReturns' AND column_name = 'ReturnedQty') THEN 
                        ALTER TABLE ""PackagingReturns"" ADD COLUMN ""ReturnedQty"" INT NOT NULL DEFAULT 0; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingReturns' AND column_name = 'ReturnDate') THEN 
                        ALTER TABLE ""PackagingReturns"" ADD COLUMN ""ReturnDate"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(); 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingReturns' AND column_name = 'RecordedBy') THEN 
                        ALTER TABLE ""PackagingReturns"" ADD COLUMN ""RecordedBy"" VARCHAR(100) NOT NULL DEFAULT 'Hệ thống'; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingReturns' AND column_name = 'LoanId') THEN 
                        ALTER TABLE ""PackagingReturns"" ALTER COLUMN ""LoanId"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PackagingReturns' AND column_name = 'QuantityReturned') THEN 
                        ALTER TABLE ""PackagingReturns"" ALTER COLUMN ""QuantityReturned"" DROP NOT NULL; 
                    END IF; 
                  END $$;",

                @"CREATE TABLE IF NOT EXISTS ""Partners"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Code"" VARCHAR(50) NOT NULL,
                    ""Name"" VARCHAR(200) NOT NULL,
                    ""Type"" INT NOT NULL DEFAULT 0,
                    ""Phone"" VARCHAR(50) NULL,
                    ""Email"" VARCHAR(100) NULL,
                    ""Address"" VARCHAR(500) NULL,
                    ""TaxCode"" VARCHAR(50) NULL,
                    ""ContactPerson"" VARCHAR(100) NULL,
                    ""Note"" TEXT NULL,
                    ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""AppNotifications"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""NotificationName"" VARCHAR(100) NOT NULL,
                    ""Title"" VARCHAR(200) NOT NULL,
                    ""Message"" TEXT NOT NULL,
                    ""Severity"" VARCHAR(50) NOT NULL DEFAULT 'info',
                    ""Link"" VARCHAR(500) NULL,
                    ""DataJson"" TEXT NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""UserNotifications"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""UserId"" INT NOT NULL,
                    ""NotificationId"" INT NOT NULL,
                    ""State"" INT NOT NULL DEFAULT 0,
                    ""ReadAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"CREATE TABLE IF NOT EXISTS ""AuditLogs"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Timestamp"" VARCHAR(50) NOT NULL DEFAULT '',
                    ""UserName"" VARCHAR(100) NOT NULL DEFAULT 'System',
                    ""UserRole"" VARCHAR(100) NOT NULL DEFAULT 'Nhân viên',
                    ""Action"" VARCHAR(100) NOT NULL DEFAULT 'UPDATE',
                    ""TargetModule"" VARCHAR(100) NOT NULL DEFAULT 'Hệ thống',
                    ""Details"" TEXT NOT NULL DEFAULT '',
                    ""IpAddress"" VARCHAR(500) NOT NULL DEFAULT '127.0.0.1',
                    ""Browser"" VARCHAR(500) NOT NULL DEFAULT 'Chrome',
                    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
                    ""ExecutionDurationMs"" INT NOT NULL DEFAULT 0,
                    ""OldValues"" TEXT NULL,
                    ""NewValues"" TEXT NULL,
                    ""TenantId"" INT NULL,
                    ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NULL,
                    ""IsDeleted"" BOOLEAN NOT NULL DEFAULT FALSE
                );",

                @"DO $$ 
                  BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'Timestamp') THEN 
                        ALTER TABLE ""AuditLogs"" ADD COLUMN ""Timestamp"" VARCHAR(50) NOT NULL DEFAULT ''; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'UserRole') THEN 
                        ALTER TABLE ""AuditLogs"" ADD COLUMN ""UserRole"" VARCHAR(100) NOT NULL DEFAULT 'Nhân viên'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'TargetModule') THEN 
                        ALTER TABLE ""AuditLogs"" ADD COLUMN ""TargetModule"" VARCHAR(100) NOT NULL DEFAULT 'Hệ thống'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'Details') THEN 
                        ALTER TABLE ""AuditLogs"" ADD COLUMN ""Details"" TEXT NOT NULL DEFAULT ''; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'Browser') THEN 
                        ALTER TABLE ""AuditLogs"" ADD COLUMN ""Browser"" VARCHAR(500) NOT NULL DEFAULT 'Chrome'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'Status') THEN 
                        ALTER TABLE ""AuditLogs"" ADD COLUMN ""Status"" VARCHAR(50) NOT NULL DEFAULT 'SUCCESS'; 
                    END IF; 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'ExecutionDurationMs') THEN 
                        ALTER TABLE ""AuditLogs"" ADD COLUMN ""ExecutionDurationMs"" INT NOT NULL DEFAULT 0; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'UserId') THEN 
                        ALTER TABLE ""AuditLogs"" ALTER COLUMN ""UserId"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'EntityName') THEN 
                        ALTER TABLE ""AuditLogs"" ALTER COLUMN ""EntityName"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'EntityId') THEN 
                        ALTER TABLE ""AuditLogs"" ALTER COLUMN ""EntityId"" DROP NOT NULL; 
                    END IF; 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLogs' AND column_name = 'UserAgent') THEN 
                        ALTER TABLE ""AuditLogs"" ALTER COLUMN ""UserAgent"" DROP NOT NULL; 
                    END IF; 
                  END $$;",

                @"CREATE INDEX IF NOT EXISTS ""ix_lotbatches_fefo"" ON ""LotBatches"" (""ProductId"", ""ExpirationDate"") WHERE ""CurrentQuantity"" > 0 AND ""IsDeleted"" = FALSE;",
                @"CREATE INDEX IF NOT EXISTS ""ix_lotbatches_tenant_batchcode"" ON ""LotBatches"" (""TenantId"", ""BatchCode"");",
                @"CREATE INDEX IF NOT EXISTS ""ix_invtrans_tenant_createdat"" ON ""InventoryTransactions"" (""TenantId"", ""CreatedAt"" DESC);",
                @"CREATE INDEX IF NOT EXISTS ""ix_invitems_warehouse_lotbatch"" ON ""InventoryItems"" (""WarehouseId"", ""LotBatchId"");",
                @"CREATE INDEX IF NOT EXISTS ""ix_outbound_tenant_createdat"" ON ""OutboundReceipts"" (""TenantId"", ""CreatedAt"" DESC);",
                @"CREATE INDEX IF NOT EXISTS ""ix_auditlogs_tenant_createdat"" ON ""AuditLogs"" (""TenantId"", ""CreatedAt"" DESC);",
                @"CREATE INDEX IF NOT EXISTS ""ix_usernotif_user_state"" ON ""UserNotifications"" (""UserId"", ""State"");"
            };

            foreach (var stmt in pgDdlStatements)
            {
                try
                {
                    await _context.Database.ExecuteSqlRawAsync(stmt);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Postgres DDL Info]: {ex.Message}");
                }
            }

            return;
        }

        // Run DDL migrations independently for SQL Server
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

            @"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Partners')
              BEGIN
                  CREATE TABLE [Partners] (
                      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                      [Code] NVARCHAR(50) NOT NULL,
                      [Name] NVARCHAR(200) NOT NULL,
                      [Type] INT NOT NULL DEFAULT 0,
                      [Phone] NVARCHAR(50) NULL,
                      [Email] NVARCHAR(100) NULL,
                      [Address] NVARCHAR(500) NULL,
                      [TaxCode] NVARCHAR(50) NULL,
                      [ContactPerson] NVARCHAR(100) NULL,
                      [Note] NVARCHAR(MAX) NULL,
                      [IsActive] BIT NOT NULL DEFAULT 1,
                      [TenantId] INT NULL,
                      [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [UpdatedAt] DATETIME2 NULL,
                      [IsDeleted] BIT NOT NULL DEFAULT 0
                  );
              END",

            @"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OutboundReceipts')
              BEGIN
                  CREATE TABLE [OutboundReceipts] (
                      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                      [ReferenceNumber] NVARCHAR(100) NOT NULL,
                      [CustomerName] NVARCHAR(200) NOT NULL,
                      [Reason] NVARCHAR(200) NOT NULL DEFAULT 'Bán hàng',
                      [TransactionDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [CreatedBy] NVARCHAR(100) NOT NULL DEFAULT 'Thủ kho',
                      [TotalWeightKg] DECIMAL(18,3) NOT NULL DEFAULT 0,
                      [SubTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
                      [SuppliesTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
                      [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                      [DiscountReason] NVARCHAR(200) NULL,
                      [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                      [Note] NVARCHAR(MAX) NULL,
                      [TenantId] INT NULL,
                      [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [UpdatedAt] DATETIME2 NULL,
                      [IsDeleted] BIT NOT NULL DEFAULT 0
                  );
              END",

            @"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OutboundSupplies')
              BEGIN
                  CREATE TABLE [OutboundSupplies] (
                      [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                      [OutboundReceiptId] INT NOT NULL,
                      [Name] NVARCHAR(200) NOT NULL,
                      [PackagingCode] NVARCHAR(100) NULL,
                      [Unit] NVARCHAR(50) NOT NULL DEFAULT 'Cái',
                      [Quantity] INT NOT NULL DEFAULT 1,
                      [UnitPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
                      [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
                      [TenantId] INT NULL,
                      [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                      [UpdatedAt] DATETIME2 NULL,
                      [IsDeleted] BIT NOT NULL DEFAULT 0,
                      CONSTRAINT [FK_OutboundSupplies_OutboundReceipts] FOREIGN KEY ([OutboundReceiptId]) REFERENCES [OutboundReceipts] ([Id]) ON DELETE CASCADE
                  );
              END",

            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'TenantId') ALTER TABLE [Users] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Roles') AND name = 'TenantId') ALTER TABLE [Roles] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Warehouses') AND name = 'TenantId') ALTER TABLE [Warehouses] ADD [TenantId] INT NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Warehouses') AND name = 'Description') ALTER TABLE [Warehouses] ADD [Description] NVARCHAR(500) NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Warehouses') AND name = 'Note') ALTER TABLE [Warehouses] ADD [Note] NVARCHAR(500) NULL;",
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
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LotBatches') AND name = 'PackagingQty') ALTER TABLE [LotBatches] ADD [PackagingQty] INT NOT NULL DEFAULT 0;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LotBatches') AND name = 'Status') ALTER TABLE [LotBatches] ADD [Status] NVARCHAR(50) NOT NULL DEFAULT 'IN_STOCK';",

            // Cancellation metadata for InventoryTransactions
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'Status') ALTER TABLE [InventoryTransactions] ADD [Status] NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE';",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'CancelledAt') ALTER TABLE [InventoryTransactions] ADD [CancelledAt] DATETIME2 NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'CancelledBy') ALTER TABLE [InventoryTransactions] ADD [CancelledBy] NVARCHAR(100) NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InventoryTransactions') AND name = 'CancelReason') ALTER TABLE [InventoryTransactions] ADD [CancelReason] NVARCHAR(500) NULL;",

            // Cancellation metadata for OutboundReceipts
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OutboundReceipts') AND name = 'Status') ALTER TABLE [OutboundReceipts] ADD [Status] NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE';",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OutboundReceipts') AND name = 'CancelledAt') ALTER TABLE [OutboundReceipts] ADD [CancelledAt] DATETIME2 NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OutboundReceipts') AND name = 'CancelledBy') ALTER TABLE [OutboundReceipts] ADD [CancelledBy] NVARCHAR(100) NULL;",
            @"IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OutboundReceipts') AND name = 'CancelReason') ALTER TABLE [OutboundReceipts] ADD [CancelReason] NVARCHAR(500) NULL;",

            @"IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PackagingLoans') AND name = 'PartnerName' AND max_length = -1) ALTER TABLE [PackagingLoans] ALTER COLUMN [PartnerName] NVARCHAR(200) NOT NULL;",
            @"IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PackagingLoans') AND name = 'PartnerType' AND max_length = -1) ALTER TABLE [PackagingLoans] ALTER COLUMN [PartnerType] NVARCHAR(50) NOT NULL;",

            // Performance Indexes for SQL Server
            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LotBatches_FEFO' AND object_id = OBJECT_ID('LotBatches'))
              CREATE NONCLUSTERED INDEX [IX_LotBatches_FEFO] ON [LotBatches] ([ProductId], [ExpirationDate])
              INCLUDE ([BatchCode], [CurrentQuantity])
              WHERE [CurrentQuantity] > 0 AND [IsDeleted] = 0;",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LotBatches_Tenant_BatchCode' AND object_id = OBJECT_ID('LotBatches'))
              CREATE NONCLUSTERED INDEX [IX_LotBatches_Tenant_BatchCode] ON [LotBatches] ([TenantId], [BatchCode]);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventoryTransactions_Tenant_CreatedAt' AND object_id = OBJECT_ID('InventoryTransactions'))
              CREATE NONCLUSTERED INDEX [IX_InventoryTransactions_Tenant_CreatedAt] ON [InventoryTransactions] ([TenantId], [CreatedAt] DESC);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventoryTransactions_LotBatch_Type' AND object_id = OBJECT_ID('InventoryTransactions'))
              CREATE NONCLUSTERED INDEX [IX_InventoryTransactions_LotBatch_Type] ON [InventoryTransactions] ([LotBatchId], [Type]);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventoryItems_Warehouse_LotBatch' AND object_id = OBJECT_ID('InventoryItems'))
              CREATE NONCLUSTERED INDEX [IX_InventoryItems_Warehouse_LotBatch] ON [InventoryItems] ([WarehouseId], [LotBatchId]);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventoryItems_Tenant_Warehouse' AND object_id = OBJECT_ID('InventoryItems'))
              CREATE NONCLUSTERED INDEX [IX_InventoryItems_Tenant_Warehouse] ON [InventoryItems] ([TenantId], [WarehouseId]);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OutboundReceipts_Tenant_CreatedAt' AND object_id = OBJECT_ID('OutboundReceipts'))
              CREATE NONCLUSTERED INDEX [IX_OutboundReceipts_Tenant_CreatedAt] ON [OutboundReceipts] ([TenantId], [CreatedAt] DESC);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PackagingLoans_Tenant_Partner_Packaging' AND object_id = OBJECT_ID('PackagingLoans'))
              CREATE NONCLUSTERED INDEX [IX_PackagingLoans_Tenant_Partner_Packaging] ON [PackagingLoans] ([TenantId], [PartnerName], [PackagingId]);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLogs_Tenant_CreatedAt' AND object_id = OBJECT_ID('AuditLogs'))
              CREATE NONCLUSTERED INDEX [IX_AuditLogs_Tenant_CreatedAt] ON [AuditLogs] ([TenantId], [CreatedAt] DESC);",

            @"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserNotifications_User_State' AND object_id = OBJECT_ID('UserNotifications'))
              CREATE NONCLUSTERED INDEX [IX_UserNotifications_User_State] ON [UserNotifications] ([UserId], [State]);"
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
                TenantId = null
            });
            await _context.SaveChangesAsync();
        }

        // 3.5. Seed Kho bãi / Kho lạnh (Warehouses)
        if (!await _context.Warehouses.AnyAsync())
        {
            var warehouses = new List<Warehouse>
            {
                new()
                {
                    Code = "KHO-TONG-01",
                    Name = "Kho Lạnh Tổng Cảng Cá A1",
                    Location = "Khu Bến Cảng Cá, Vũng Tàu",
                    Type = StorageType.FrozenStorage,
                    TargetTemperature = -18,
                    MaxCapacityTon = 500,
                    IsActive = true,
                    Description = "Kho bảo quản đông lạnh hải sản tiêu chuẩn"
                },
                new()
                {
                    Code = "KHO-DONG-02",
                    Name = "Kho Cấp Đông Sâu B2",
                    Location = "Khu Chế Biến Thủy Sản",
                    Type = StorageType.DeepFreeze,
                    TargetTemperature = -25,
                    MaxCapacityTon = 300,
                    IsActive = true,
                    Description = "Kho cấp đông sâu nhiệt độ âm cao"
                }
            };
            _context.Warehouses.AddRange(warehouses);
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

        // 5.1. Seed Tài khoản Quản trị viên tối cao (Host Super Admin - TenantId = null)
        var hostAdmin = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == "admin@gmail.com");

        var adminRoleEntity = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");

        if (hostAdmin == null)
        {
            hostAdmin = new User
            {
                FullName = "Host Admin",
                Email = "admin@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("qazwsxedc@123A"),
                Phone = "0900000000",
                Status = "ACTIVE",
                TenantId = null,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(hostAdmin);
            await _context.SaveChangesAsync();

            if (adminRoleEntity != null)
            {
                _context.UserRoles.Add(new UserRole
                {
                    UserId = hostAdmin.Id,
                    RoleId = adminRoleEntity.Id,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }
        }
        else
        {
            // Cập nhật lại mật khẩu chuẩn và TenantId = null nếu tài khoản đã tồn tại
            hostAdmin.TenantId = null;
            hostAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("qazwsxedc@123A");
            hostAdmin.Status = "ACTIVE";
            await _context.SaveChangesAsync();

            if (adminRoleEntity != null)
            {
                var hasAdminRole = await _context.UserRoles
                    .AnyAsync(ur => ur.UserId == hostAdmin.Id && ur.RoleId == adminRoleEntity.Id);
                if (!hasAdminRole)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = hostAdmin.Id,
                        RoleId = adminRoleEntity.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }
            }
        }
    /*
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
        if (!await _context.Products.IgnoreQueryFilters().AnyAsync())
        {
            var caCat = await _context.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Code == "CA");
            var tomCat = await _context.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Code == "TOM");
            var cuaCat = await _context.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Code == "CUA");
            var mucCat = await _context.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Code == "MUC");

            var products = new List<Product>
            {
                new()
                {
                    Code = "HS-001",
                    Name = "Cá hồi Na Uy nguyên con",
                    ScientificName = "Salmo salar",
                    CategoryId = caCat?.Id ?? 1,
                    StorageType = "FRESH",
                    TargetTemperature = 0,
                    WarningDaysBeforeExpiry = 5,
                    MinimumStock = 50,
                    MaximumStock = 500,
                    Unit = "Kg",
                    ReferencePrice = 320000,
                    Status = "ACTIVE",
                    TenantId = null
                },
                new()
                {
                    Code = "HS-002",
                    Name = "Tôm sú Cà Mau tươi sống",
                    ScientificName = "Penaeus monodon",
                    CategoryId = tomCat?.Id ?? 2,
                    StorageType = "ALIVE",
                    TargetTemperature = 18,
                    WarningDaysBeforeExpiry = 3,
                    MinimumStock = 30,
                    MaximumStock = 300,
                    Unit = "Kg",
                    ReferencePrice = 450000,
                    Status = "ACTIVE",
                    TenantId = null
                },
                new()
                {
                    Code = "CA-NGU-001",
                    Name = "Cá ngừ đại dương tươi sống",
                    ScientificName = "Thunnus albacares",
                    CategoryId = caCat?.Id ?? 1,
                    StorageType = "FROZEN",
                    TargetTemperature = -18,
                    WarningDaysBeforeExpiry = 5,
                    MinimumStock = 50,
                    MaximumStock = 500,
                    Unit = "Kg",
                    ReferencePrice = 280000,
                    Status = "ACTIVE",
                    TenantId = null
                },
                new()
                {
                    Code = "TOM-HUM-001",
                    Name = "Tôm hùm bông Nha Trang",
                    ScientificName = "Panulirus ornatus",
                    CategoryId = tomCat?.Id ?? 2,
                    StorageType = "ALIVE",
                    TargetTemperature = 18,
                    WarningDaysBeforeExpiry = 3,
                    MinimumStock = 20,
                    MaximumStock = 200,
                    Unit = "Kg",
                    ReferencePrice = 1250000,
                    Status = "ACTIVE",
                    TenantId = null
                },
                new()
                {
                    Code = "CUA-HD-001",
                    Name = "Cua hoàng đế King Crab",
                    ScientificName = "Paralithodes camtschaticus",
                    CategoryId = cuaCat?.Id ?? 3,
                    StorageType = "ALIVE",
                    TargetTemperature = 16,
                    WarningDaysBeforeExpiry = 3,
                    MinimumStock = 10,
                    MaximumStock = 100,
                    Unit = "Con",
                    ReferencePrice = 2200000,
                    Status = "ACTIVE",
                    TenantId = null
                },
                new()
                {
                    Code = "MUC-LA-001",
                    Name = "Mực lá câu đại Côn Đảo",
                    ScientificName = "Sepioteuthis lessoniana",
                    CategoryId = mucCat?.Id ?? 4,
                    StorageType = "FRESH",
                    TargetTemperature = 0,
                    WarningDaysBeforeExpiry = 4,
                    MinimumStock = 30,
                    MaximumStock = 300,
                    Unit = "Kg",
                    ReferencePrice = 350000,
                    Status = "ACTIVE",
                    TenantId = null
                }
            };

            _context.Products.AddRange(products);
            await _context.SaveChangesAsync();
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
                    Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
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
                    Timestamp = DateTime.UtcNow.AddMinutes(-25).ToString("yyyy-MM-ddTHH:mm:ssZ"),
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

        // 8. Seed Đối tác mẫu (Nhà cung cấp & Khách hàng)
        if (!await _context.Partners.AnyAsync())
        {
            var partners = new List<Partner>
            {
                new()
                {
                    Code = "NCC-TAU-01",
                    Name = "Đội Tàu Đánh Bắt Xa Bờ Đà Nẵng 01",
                    Type = PartnerType.Supplier,
                    Phone = "0912 345 678",
                    Email = "taudanhbat01@cangdanang.vn",
                    Address = "Cầu cảng số 3, Cảng Cá Thọ Quang, Đà Nẵng",
                    ContactPerson = "Thuyền trưởng Nguyễn Văn Hải",
                    Note = "Cung cấp cá ngừ, cá thu đại dương tươi sống",
                    IsActive = true
                },
                new()
                {
                    Code = "NCC-HTX-CAMAU",
                    Name = "HTX Nuôi Tôm Sinh Thái Cà Mau",
                    Type = PartnerType.Supplier,
                    Phone = "0290 388 999",
                    Email = "hop_tac_xa@tomcamau.vn",
                    Address = "Huyện Năm Căn, Tỉnh Cà Mau",
                    ContactPerson = "Ông Ba Cà Mau",
                    Note = "Chuyên tôm sú, tôm càng xanh, cua biển",
                    IsActive = true
                },
                new()
                {
                    Code = "KH-NHAHANG-BIENDONG",
                    Name = "Chuỗi Nhà Hàng Hải Sản Biển Đông",
                    Type = PartnerType.Customer,
                    Phone = "0988 777 666",
                    Email = "bep_truong@nhahangbiendong.com",
                    Address = "88 Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
                    ContactPerson = "Bếp trưởng Lê Văn Tài",
                    TaxCode = "0400 987 654",
                    Note = "Giao hàng mỗi ngày trước 09:00 sáng",
                    IsActive = true
                },
                new()
                {
                    Code = "KH-SIEU-THI-WINMART",
                    Name = "Hệ Thống Siêu Thị WinMart Miền Trung",
                    Type = PartnerType.Customer,
                    Phone = "024 710 66866",
                    Email = "muahang@winmart.masan.vn",
                    Address = "Khu công nghiệp Hòa Khánh, Liên Chiểu, Đà Nẵng",
                    ContactPerson = "Phòng Thu Mua Thực Phẩm Tươi Sống",
                    TaxCode = "0104 918 404",
                    IsActive = true
                }
            };

            _context.Partners.AddRange(partners);
            await _context.SaveChangesAsync();
        }
    */
    }
}
