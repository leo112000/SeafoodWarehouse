using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Application.DTOs.Tenant;
using SeafoodWarehouseManagement.Application.Services.Interfaces;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.Application.Services;

public class TenantService : ITenantService
{
    private readonly IApplicationDbContext _context;

    public TenantService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<TenantDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var tenants = await _context.Tenants
            .Where(t => !t.IsDeleted)
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .ToListAsync(cancellationToken);

        return tenants.Select(MapToDto).ToList();
    }

    public async Task<TenantDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);

        return tenant == null ? null : MapToDto(tenant);
    }

    public async Task<TenantDto?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Code.ToLower() == code.ToLower() && !t.IsDeleted, cancellationToken);

        return tenant == null ? null : MapToDto(tenant);
    }

    public async Task<Result<TenantDto>> CreateAsync(CreateTenantDto dto, CancellationToken cancellationToken = default)
    {
        var existingCodes = await _context.Tenants.Where(t => !t.IsDeleted).Select(t => t.Code).ToListAsync(cancellationToken);

        var code = dto.Code;
        if (string.IsNullOrWhiteSpace(code))
        {
            var baseCode = SeafoodWarehouseManagement.Application.Common.Helpers.CodeGeneratorHelper.GenerateCode(dto.Name, "CN");
            code = baseCode;
            var counter = 1;
            while (existingCodes.Any(c => string.Equals(c, code, StringComparison.OrdinalIgnoreCase)))
            {
                code = $"{baseCode}-{counter:D2}";
                counter++;
            }
        }
        else
        {
            code = code.Trim().ToUpper();
            if (existingCodes.Any(c => string.Equals(c, code, StringComparison.OrdinalIgnoreCase)))
            {
                return Result<TenantDto>.Failure($"Mã cửa hàng '{code}' đã tồn tại trong hệ thống.");
            }
        }

        var tenant = new Tenant
        {
            Code = code,
            Name = dto.Name.Trim(),
            Address = dto.Address?.Trim(),
            Phone = dto.Phone?.Trim(),
            Email = dto.Email?.Trim(),
            TaxCode = dto.TaxCode?.Trim(),
            LogoUrl = dto.LogoUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync(cancellationToken);

        // 1. Tạo Role Admin riêng cho Tenant mới
        var adminRole = new Role
        {
            Name = "Admin",
            Description = $"Quản trị viên toàn quyền hệ thống kho - {tenant.Name}",
            IsSystemDefault = true,
            TenantId = tenant.Id
        };
        _context.Roles.Add(adminRole);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Cấp đầy đủ quyền hệ thống cho Role Admin của Tenant
        var allPermissions = new List<string>
        {
            "Pages.Dashboard.View", "Pages.Products.View", "Pages.Products.Create", "Pages.Products.Edit", "Pages.Products.Delete",
            "Pages.Packaging.View", "Pages.Packaging.Create", "Pages.Packaging.Edit", "Pages.Packaging.Delete",
            "Pages.Categories.View", "Pages.Categories.Create", "Pages.Categories.Edit", "Pages.Categories.Delete",
            "Pages.Warehouses.View", "Pages.Warehouses.Create", "Pages.Warehouses.Edit", "Pages.Warehouses.Delete",
            "Pages.Inbound.Create", "Pages.Inbound.View", "Pages.Outbound.Create", "Pages.Outbound.View",
            "Pages.Wastage.Create", "Pages.Wastage.View", "Pages.PackagingReturn.Create", "Pages.PackagingReturn.View",
            "Pages.Reports.View", "Pages.Alerts.View", "Pages.Users.Manage", "Pages.Roles.Manage", "Pages.Settings.Manage", "Pages.Tenants.Manage", "Pages.AuditLogs.View"
        };

        foreach (var perm in allPermissions)
        {
            _context.RolePermissions.Add(new RolePermission
            {
                RoleId = adminRole.Id,
                PermissionCode = perm
            });
        }

        // 3. Khởi tạo cấu hình kho mặc định (SystemSetting) cho Tenant
        _context.Settings.Add(new SystemSetting
        {
            ExpiringAlertDays = 15,
            TempDeviationThreshold = 3.0,
            DefaultSeafoodPrice = 250000,
            AutoRefreshIntervalSeconds = 30,
            LowStockWarningPercent = 100.0,
            TenantId = tenant.Id
        });

        // 4. Tạo Tài khoản Admin cho Tenant
        var adminEmail = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : $"admin@{tenant.Code.ToLower()}.com";
        var adminUser = new User
        {
            FullName = $"Admin ({tenant.Name})",
            Email = adminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"), // Mật khẩu mặc định khởi tạo được băm BCrypt chuẩn
            Phone = dto.Phone?.Trim() ?? string.Empty,
            Status = "ACTIVE",
            TenantId = tenant.Id,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(adminUser);
        await _context.SaveChangesAsync(cancellationToken);

        // 5. Gán Role Admin cho tài khoản User
        _context.UserRoles.Add(new UserRole
        {
            UserId = adminUser.Id,
            RoleId = adminRole.Id
        });
        await _context.SaveChangesAsync(cancellationToken);

        return Result<TenantDto>.Success(MapToDto(tenant));
    }

    public async Task<Result<TenantDto>> UpdateAsync(int id, UpdateTenantDto dto, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);
        if (tenant == null)
        {
            return Result<TenantDto>.Failure($"Không tìm thấy Cửa hàng/Chi nhánh với Id = {id}.");
        }

        tenant.Name = dto.Name.Trim();
        tenant.Address = dto.Address?.Trim();
        tenant.Phone = dto.Phone?.Trim();
        tenant.Email = dto.Email?.Trim();
        tenant.TaxCode = dto.TaxCode?.Trim();
        tenant.LogoUrl = dto.LogoUrl;
        tenant.IsActive = dto.IsActive;
        tenant.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<TenantDto>.Success(MapToDto(tenant));
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);
        if (tenant == null)
        {
            return Result.Failure($"Không tìm thấy Cửa hàng/Chi nhánh với Id = {id}.");
        }

        tenant.IsDeleted = true;
        tenant.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private static TenantDto MapToDto(Tenant t) => new()
    {
        Id = t.Id,
        Code = t.Code,
        Name = t.Name,
        Address = t.Address,
        Phone = t.Phone,
        Email = t.Email,
        TaxCode = t.TaxCode,
        LogoUrl = t.LogoUrl,
        IsActive = t.IsActive,
        CreatedAt = t.CreatedAt,
    };
}
