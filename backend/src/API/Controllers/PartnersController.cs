using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

public class PartnerDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "SUPPLIER"; // SUPPLIER | CUSTOMER
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string TaxCode { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
    public int? TenantId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePartnerDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "SUPPLIER"; // SUPPLIER | CUSTOMER
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? TaxCode { get; set; }
    public string? ContactPerson { get; set; }
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdatePartnerDto : CreatePartnerDto
{
}

[Route("api/[controller]")]
public class PartnersController : BaseApiController
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentTenant _currentTenant;

    public PartnersController(IApplicationDbContext context, ICurrentTenant currentTenant)
    {
        _context = context;
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Lấy danh sách đối tác (Nhà cung cấp / Khách hàng)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<List<PartnerDto>>>> GetAll(
        [FromQuery] string? type,
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Partners.Where(p => !p.IsDeleted).AsQueryable();

        if (!string.IsNullOrWhiteSpace(type))
        {
            var isSupplier = type.Equals("SUPPLIER", StringComparison.OrdinalIgnoreCase);
            var targetType = isSupplier ? PartnerType.Supplier : PartnerType.Customer;
            query = query.Where(p => p.Type == targetType);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(s) || p.Code.ToLower().Contains(s) || p.Phone.Contains(s));
        }

        var list = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PartnerDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Type = p.Type == PartnerType.Supplier ? "SUPPLIER" : "CUSTOMER",
                Phone = p.Phone,
                Email = p.Email,
                Address = p.Address,
                TaxCode = p.TaxCode,
                ContactPerson = p.ContactPerson,
                Note = p.Note,
                IsActive = p.IsActive,
                TenantId = p.TenantId,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(Result<List<PartnerDto>>.Success(list));
    }

    /// <summary>
    /// Lấy chi tiết đối tác theo ID
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Result<PartnerDto>>> GetById(int id, CancellationToken cancellationToken = default)
    {
        var p = await _context.Partners.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (p == null) return NotFound(Result<PartnerDto>.Failure("Không tìm thấy đối tác."));

        return Ok(Result<PartnerDto>.Success(new PartnerDto
        {
            Id = p.Id,
            Code = p.Code,
            Name = p.Name,
            Type = p.Type == PartnerType.Supplier ? "SUPPLIER" : "CUSTOMER",
            Phone = p.Phone,
            Email = p.Email,
            Address = p.Address,
            TaxCode = p.TaxCode,
            ContactPerson = p.ContactPerson,
            Note = p.Note,
            IsActive = p.IsActive,
            TenantId = p.TenantId,
            CreatedAt = p.CreatedAt
        }));
    }

    /// <summary>
    /// Thêm mới đối tác
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<PartnerDto>>> Create([FromBody] CreatePartnerDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Code))
        {
            return BadRequest(Result<PartnerDto>.Failure("Mã và Tên đối tác không được để trống."));
        }

        var codeExists = await _context.Partners.AnyAsync(p => p.Code == dto.Code.Trim().ToUpper() && !p.IsDeleted, cancellationToken);
        if (codeExists)
        {
            return BadRequest(Result<PartnerDto>.Failure($"Mã đối tác '{dto.Code}' đã tồn tại trong hệ thống."));
        }

        var partner = new Partner
        {
            Code = dto.Code.Trim().ToUpper(),
            Name = dto.Name.Trim(),
            Type = dto.Type.Equals("CUSTOMER", StringComparison.OrdinalIgnoreCase) ? PartnerType.Customer : PartnerType.Supplier,
            Phone = dto.Phone ?? string.Empty,
            Email = dto.Email ?? string.Empty,
            Address = dto.Address ?? string.Empty,
            TaxCode = dto.TaxCode ?? string.Empty,
            ContactPerson = dto.ContactPerson ?? string.Empty,
            Note = dto.Note,
            IsActive = dto.IsActive,
            TenantId = _currentTenant.Id,
            CreatedAt = DateTime.UtcNow
        };

        _context.Partners.Add(partner);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<PartnerDto>.Success(new PartnerDto
        {
            Id = partner.Id,
            Code = partner.Code,
            Name = partner.Name,
            Type = partner.Type == PartnerType.Supplier ? "SUPPLIER" : "CUSTOMER",
            Phone = partner.Phone,
            Email = partner.Email,
            Address = partner.Address,
            TaxCode = partner.TaxCode,
            ContactPerson = partner.ContactPerson,
            Note = partner.Note,
            IsActive = partner.IsActive,
            TenantId = partner.TenantId,
            CreatedAt = partner.CreatedAt
        }));
    }

    /// <summary>
    /// Cập nhật đối tác
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Result<PartnerDto>>> Update(int id, [FromBody] UpdatePartnerDto dto, CancellationToken cancellationToken = default)
    {
        var p = await _context.Partners.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (p == null) return NotFound(Result<PartnerDto>.Failure("Không tìm thấy đối tác."));

        p.Name = dto.Name.Trim();
        p.Type = dto.Type.Equals("CUSTOMER", StringComparison.OrdinalIgnoreCase) ? PartnerType.Customer : PartnerType.Supplier;
        p.Phone = dto.Phone ?? p.Phone;
        p.Email = dto.Email ?? p.Email;
        p.Address = dto.Address ?? p.Address;
        p.TaxCode = dto.TaxCode ?? p.TaxCode;
        p.ContactPerson = dto.ContactPerson ?? p.ContactPerson;
        p.Note = dto.Note;
        p.IsActive = dto.IsActive;
        p.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<PartnerDto>.Success(new PartnerDto
        {
            Id = p.Id,
            Code = p.Code,
            Name = p.Name,
            Type = p.Type == PartnerType.Supplier ? "SUPPLIER" : "CUSTOMER",
            Phone = p.Phone,
            Email = p.Email,
            Address = p.Address,
            TaxCode = p.TaxCode,
            ContactPerson = p.ContactPerson,
            Note = p.Note,
            IsActive = p.IsActive,
            TenantId = p.TenantId,
            CreatedAt = p.CreatedAt
        }));
    }

    /// <summary>
    /// Xóa đối tác (Xóa mềm)
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<Result>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var p = await _context.Partners.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (p == null) return NotFound(Result.Failure("Không tìm thấy đối tác."));

        p.IsDeleted = true;
        p.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result.Success("Đã xóa đối tác thành công."));
    }
}
