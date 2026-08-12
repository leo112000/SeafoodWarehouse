# ABP Development Rules

## Multi-tenancy
The application uses ABP MultiTenancy.
Tenant-aware data must respect the application's tenant isolation rules.

Before modifying tenant-related code, inspect:
- AbpSession
- TenantId
- IMayHaveTenant
- IMustHaveTenant
- Data filters
- Current tenant context

Never bypass tenant filters without understanding why the existing implementation does so.

---

## Database Migrations (EF Core)
Database changes must use EF Core migrations via ABP CLI or EF Core tools.
- AI must NOT automatically apply migrations to production/staging without human approval.
- Before creating a migration:
  1. Inspect existing migrations.
  2. Verify entity configuration.
  3. Verify tenant behavior (TenantId indexing).
  4. Inspect generated migration code for unintended `DropTable` or `DropColumn` actions.

---

## Application Services & DTOs
- Business use cases belong in application services.
- Controllers should delegate to application services.
- Do not expose EF entities directly from APIs. Use DTOs for external API contracts.
