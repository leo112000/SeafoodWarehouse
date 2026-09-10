using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOptimizedIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PackagingLoans_Packagings_PackagingId",
                table: "PackagingLoans");

            migrationBuilder.DropIndex(
                name: "IX_LotBatches_BatchCode",
                table: "LotBatches");

            migrationBuilder.DropIndex(
                name: "IX_LotBatches_ProductId",
                table: "LotBatches");

            migrationBuilder.DropIndex(
                name: "IX_InventoryTransactions_LotBatchId",
                table: "InventoryTransactions");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_WarehouseId",
                table: "InventoryItems");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Warehouses",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PackagingReturns",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PartnerType",
                table: "PackagingLoans",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "PartnerName",
                table: "PackagingLoans",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Note",
                table: "PackagingLoans",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PackagingLoans",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UserName",
                table: "AuditLogs",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Timestamp",
                table: "AuditLogs",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "TargetModule",
                table: "AuditLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Action",
                table: "AuditLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "AuditLogs",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AppNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NotificationName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Link = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TenantId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppNotifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OutboundReceipts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TotalWeightKg = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    SuppliesTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountReason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TenantId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboundReceipts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Partners",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TaxCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContactPerson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    TenantId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Partners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    NotificationId = table.Column<int>(type: "int", nullable: false),
                    State = table.Column<int>(type: "int", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TenantId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserNotifications_AppNotifications_NotificationId",
                        column: x => x.NotificationId,
                        principalTable: "AppNotifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserNotifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OutboundSupplies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OutboundReceiptId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PackagingCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TenantId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboundSupplies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OutboundSupplies_OutboundReceipts_OutboundReceiptId",
                        column: x => x.OutboundReceiptId,
                        principalTable: "OutboundReceipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PackagingLoans_Tenant_LoanDate",
                table: "PackagingLoans",
                columns: new[] { "TenantId", "LoanDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PackagingLoans_Tenant_Partner_Packaging",
                table: "PackagingLoans",
                columns: new[] { "TenantId", "PartnerName", "PackagingId" });

            migrationBuilder.CreateIndex(
                name: "IX_LotBatches_BatchCode",
                table: "LotBatches",
                column: "BatchCode");

            migrationBuilder.CreateIndex(
                name: "IX_LotBatches_FEFO",
                table: "LotBatches",
                columns: new[] { "ProductId", "ExpirationDate" },
                filter: "[CurrentQuantity] > 0 AND [IsDeleted] = 0")
                .Annotation("SqlServer:Include", new[] { "BatchCode", "CurrentQuantity" });

            migrationBuilder.CreateIndex(
                name: "IX_LotBatches_Tenant_BatchCode",
                table: "LotBatches",
                columns: new[] { "TenantId", "BatchCode" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_LotBatch_Type",
                table: "InventoryTransactions",
                columns: new[] { "LotBatchId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_ReferenceNumber",
                table: "InventoryTransactions",
                column: "ReferenceNumber");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_Tenant_CreatedAt",
                table: "InventoryTransactions",
                columns: new[] { "TenantId", "CreatedAt" })
                .Annotation("SqlServer:Include", new[] { "Type", "Quantity", "ReferenceNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_Tenant_Warehouse",
                table: "InventoryItems",
                columns: new[] { "TenantId", "WarehouseId" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_Warehouse_LotBatch",
                table: "InventoryItems",
                columns: new[] { "WarehouseId", "LotBatchId" })
                .Annotation("SqlServer:Include", new[] { "StorageBin", "Quantity" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Tenant_Timestamp",
                table: "AuditLogs",
                columns: new[] { "TenantId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboundReceipts_ReferenceNumber",
                table: "OutboundReceipts",
                column: "ReferenceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboundReceipts_Tenant_CreatedAt",
                table: "OutboundReceipts",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboundSupplies_OutboundReceiptId",
                table: "OutboundSupplies",
                column: "OutboundReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_UserNotifications_NotificationId",
                table: "UserNotifications",
                column: "NotificationId");

            migrationBuilder.CreateIndex(
                name: "IX_UserNotifications_User_State_CreatedAt",
                table: "UserNotifications",
                columns: new[] { "UserId", "State", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_PackagingLoans_Packagings_PackagingId",
                table: "PackagingLoans",
                column: "PackagingId",
                principalTable: "Packagings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PackagingLoans_Packagings_PackagingId",
                table: "PackagingLoans");

            migrationBuilder.DropTable(
                name: "OutboundSupplies");

            migrationBuilder.DropTable(
                name: "Partners");

            migrationBuilder.DropTable(
                name: "UserNotifications");

            migrationBuilder.DropTable(
                name: "OutboundReceipts");

            migrationBuilder.DropTable(
                name: "AppNotifications");

            migrationBuilder.DropIndex(
                name: "IX_PackagingLoans_Tenant_LoanDate",
                table: "PackagingLoans");

            migrationBuilder.DropIndex(
                name: "IX_PackagingLoans_Tenant_Partner_Packaging",
                table: "PackagingLoans");

            migrationBuilder.DropIndex(
                name: "IX_LotBatches_BatchCode",
                table: "LotBatches");

            migrationBuilder.DropIndex(
                name: "IX_LotBatches_FEFO",
                table: "LotBatches");

            migrationBuilder.DropIndex(
                name: "IX_LotBatches_Tenant_BatchCode",
                table: "LotBatches");

            migrationBuilder.DropIndex(
                name: "IX_InventoryTransactions_LotBatch_Type",
                table: "InventoryTransactions");

            migrationBuilder.DropIndex(
                name: "IX_InventoryTransactions_ReferenceNumber",
                table: "InventoryTransactions");

            migrationBuilder.DropIndex(
                name: "IX_InventoryTransactions_Tenant_CreatedAt",
                table: "InventoryTransactions");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_Tenant_Warehouse",
                table: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_Warehouse_LotBatch",
                table: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_Tenant_Timestamp",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Warehouses");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PackagingReturns");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PackagingLoans");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AuditLogs");

            migrationBuilder.AlterColumn<string>(
                name: "PartnerType",
                table: "PackagingLoans",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "PartnerName",
                table: "PackagingLoans",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Note",
                table: "PackagingLoans",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UserName",
                table: "AuditLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Timestamp",
                table: "AuditLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "TargetModule",
                table: "AuditLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Action",
                table: "AuditLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.CreateIndex(
                name: "IX_LotBatches_BatchCode",
                table: "LotBatches",
                column: "BatchCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LotBatches_ProductId",
                table: "LotBatches",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryTransactions_LotBatchId",
                table: "InventoryTransactions",
                column: "LotBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_WarehouseId",
                table: "InventoryItems",
                column: "WarehouseId");

            migrationBuilder.AddForeignKey(
                name: "FK_PackagingLoans_Packagings_PackagingId",
                table: "PackagingLoans",
                column: "PackagingId",
                principalTable: "Packagings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
