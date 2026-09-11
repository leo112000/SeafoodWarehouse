using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

public class PackagingDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "CONTAINER";
    public decimal DefaultTareWeight { get; set; }
    public string Unit { get; set; } = "Cái";
    public int StockQuantity { get; set; }
    public string? Note { get; set; }
}

public class CreatePackagingDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "CONTAINER";
    public decimal DefaultTareWeight { get; set; }
    public string Unit { get; set; } = "Cái";
    public int StockQuantity { get; set; }
    public string? Note { get; set; }
}

public class PackagingLoanDto
{
    public string Id { get; set; } = string.Empty;
    public string PartnerName { get; set; } = string.Empty;
    public string PartnerType { get; set; } = "CUSTOMER";
    public string PackagingCode { get; set; } = string.Empty;
    public string PackagingName { get; set; } = string.Empty;
    public int LoanedQty { get; set; }
    public int ReturnedQty { get; set; }
    public string Date { get; set; } = string.Empty;
    public string? Note { get; set; }
}

public class CreateLoanDto
{
    public string PartnerName { get; set; } = string.Empty;
    public string PartnerType { get; set; } = "CUSTOMER";
    public string PackagingCode { get; set; } = string.Empty;
    public int LoanedQty { get; set; }
    public string? Note { get; set; }
}

public class CreateReturnDto
{
    public int LoanId { get; set; }
    public int ReturnedQty { get; set; }
    public string RecordedBy { get; set; } = "Hệ thống";
    public string? Note { get; set; }
}

public class PackagingReturnHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string LoanId { get; set; } = string.Empty;
    public string PartnerName { get; set; } = string.Empty;
    public string PackagingCode { get; set; } = string.Empty;
    public string PackagingName { get; set; } = string.Empty;
    public int ReturnedQty { get; set; }
    public string ReturnDate { get; set; } = string.Empty;
    public string RecordedBy { get; set; } = "Hệ thống";
    public string? Note { get; set; }
}

/// <summary>
/// API Quản lý Bao bì, Sọt chứa & Thu hồi vỏ bao bì
/// </summary>
[Route("api/[controller]")]
public class PackagingController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public PackagingController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách bao bì và sọt chứa từ CSDL
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<List<PackagingDto>>>> GetPackagingTypes(CancellationToken cancellationToken = default)
    {
        var packagings = await _context.Packagings
            .Where(p => !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .ToListAsync(cancellationToken);

        var dtos = packagings.Select(p => new PackagingDto
        {
            Id = p.Id.ToString(),
            Code = p.Code,
            Name = p.Name,
            Category = p.Category,
            DefaultTareWeight = p.DefaultTareWeight,
            Unit = p.Unit,
            StockQuantity = p.StockQuantity,
            Note = p.Note
        }).ToList();

        return Ok(Result<List<PackagingDto>>.Success(dtos));
    }

    /// <summary>
    /// Tạo mới loại bao bì
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<PackagingDto>>> Create([FromBody] CreatePackagingDto dto, CancellationToken cancellationToken = default)
    {
        var existingCodes = await _context.Packagings.Where(p => !p.IsDeleted).Select(p => p.Code).ToListAsync(cancellationToken);

        var code = dto.Code;
        if (string.IsNullOrWhiteSpace(code))
        {
            var baseCode = SeafoodWarehouseManagement.Application.Common.Helpers.CodeGeneratorHelper.GenerateCode(dto.Name, "PKG");
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
                return BadRequest(Result<PackagingDto>.Failure($"Mã bao bì '{code}' đã tồn tại."));
            }
        }

        var packaging = new Packaging
        {
            Code = code,
            Name = dto.Name,
            Category = dto.Category,
            DefaultTareWeight = dto.DefaultTareWeight,
            Unit = dto.Unit,
            StockQuantity = dto.StockQuantity,
            Note = dto.Note
        };

        _context.Packagings.Add(packaging);
        await _context.SaveChangesAsync(cancellationToken);

        var result = new PackagingDto
        {
            Id = packaging.Id.ToString(),
            Code = packaging.Code,
            Name = packaging.Name,
            Category = packaging.Category,
            DefaultTareWeight = packaging.DefaultTareWeight,
            Unit = packaging.Unit,
            StockQuantity = packaging.StockQuantity,
            Note = packaging.Note
        };

        return Ok(Result<PackagingDto>.Success(result));
    }

    /// <summary>
    /// Cập nhật loại bao bì
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<Result<PackagingDto>>> Update(int id, [FromBody] CreatePackagingDto dto, CancellationToken cancellationToken = default)
    {
        var packaging = await _context.Packagings.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, cancellationToken);
        if (packaging == null)
        {
            return NotFound(Result<PackagingDto>.Failure("Không tìm thấy bao bì."));
        }

        packaging.Code = dto.Code;
        packaging.Name = dto.Name;
        packaging.Category = dto.Category;
        packaging.DefaultTareWeight = dto.DefaultTareWeight;
        packaging.Unit = dto.Unit;
        packaging.StockQuantity = dto.StockQuantity;
        packaging.Note = dto.Note;

        await _context.SaveChangesAsync(cancellationToken);

        var result = new PackagingDto
        {
            Id = packaging.Id.ToString(),
            Code = packaging.Code,
            Name = packaging.Name,
            Category = packaging.Category,
            DefaultTareWeight = packaging.DefaultTareWeight,
            Unit = packaging.Unit,
            StockQuantity = packaging.StockQuantity,
            Note = packaging.Note
        };

        return Ok(Result<PackagingDto>.Success(result));
    }

    /// <summary>
    /// Xóa loại bao bì
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<Result<bool>>> Delete(int id, CancellationToken cancellationToken = default)
    {
        var packaging = await _context.Packagings.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, cancellationToken);
        if (packaging == null)
        {
            return NotFound(Result<bool>.Failure("Không tìm thấy bao bì."));
        }

        packaging.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<bool>.Success(true));
    }

    /// <summary>
    /// Lấy danh sách phiếu mượn sọt / vỏ bao bì
    /// <summary>
    /// Lấy danh sách phiếu mượn sọt / vỏ bao bì
    /// </summary>
    [HttpGet("loans")]
    [HttpGet("/api/packaging-loans")]
    public async Task<ActionResult<Result<List<PackagingLoanDto>>>> GetLoans(CancellationToken cancellationToken = default)
    {
        var loans = await _context.PackagingLoans
            .Where(l => !l.IsDeleted)
            .Include(l => l.Packaging)
            .OrderByDescending(l => l.LoanDate)
            .ThenByDescending(l => l.Id)
            .ToListAsync(cancellationToken);

        var dtos = loans.Select(l => new PackagingLoanDto
        {
            Id = l.Id.ToString(),
            PartnerName = l.PartnerName,
            PartnerType = l.PartnerType,
            PackagingCode = l.Packaging.Code,
            PackagingName = l.Packaging.Name,
            LoanedQty = l.LoanedQty,
            ReturnedQty = l.ReturnedQty,
            Date = l.LoanDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Note = l.Note
        }).ToList();

        return Ok(Result<List<PackagingLoanDto>>.Success(dtos));
    }

    /// <summary>
    /// Tạo phiếu mượn vỏ sọt / bao bì
    /// </summary>
    [HttpPost("loans")]
    [HttpPost("/api/packaging-loans")]
    public async Task<ActionResult<Result<PackagingLoanDto>>> CreateLoan([FromBody] CreateLoanDto dto, CancellationToken cancellationToken = default)
    {
        var pkg = await _context.Packagings.FirstOrDefaultAsync(p => p.Code == dto.PackagingCode && !p.IsDeleted, cancellationToken);
        if (pkg == null)
        {
            return BadRequest(Result<PackagingLoanDto>.Failure("Mã bao bì không tồn tại."));
        }

        var loan = new PackagingLoan
        {
            PartnerName = dto.PartnerName,
            PartnerType = dto.PartnerType,
            PackagingId = pkg.Id,
            LoanedQty = dto.LoanedQty,
            ReturnedQty = 0,
            LoanDate = DateTime.UtcNow,
            Note = dto.Note
        };

        _context.PackagingLoans.Add(loan);
        await _context.SaveChangesAsync(cancellationToken);

        var result = new PackagingLoanDto
        {
            Id = loan.Id.ToString(),
            PartnerName = loan.PartnerName,
            PartnerType = loan.PartnerType,
            PackagingCode = pkg.Code,
            PackagingName = pkg.Name,
            LoanedQty = loan.LoanedQty,
            ReturnedQty = 0,
            Date = loan.LoanDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Note = loan.Note
        };

        return Ok(Result<PackagingLoanDto>.Success(result));
    }

    /// <summary>
    /// Lấy danh sách lịch sử trả sọt / vỏ bao bì
    /// </summary>
    [HttpGet("returns")]
    [HttpGet("/api/packaging-returns")]
    public async Task<ActionResult<Result<List<PackagingReturnHistoryDto>>>> GetReturns(CancellationToken cancellationToken = default)
    {
        var returns = await _context.PackagingReturns
            .Where(r => !r.IsDeleted)
            .Include(r => r.PackagingLoan)
            .ThenInclude(l => l.Packaging)
            .OrderByDescending(r => r.ReturnDate)
            .ThenByDescending(r => r.Id)
            .ToListAsync(cancellationToken);

        var dtos = returns.Select(r => new PackagingReturnHistoryDto
        {
            Id = r.Id.ToString(),
            LoanId = r.PackagingLoanId.ToString(),
            PartnerName = r.PackagingLoan?.PartnerName ?? "",
            PackagingCode = r.PackagingLoan?.Packaging?.Code ?? "",
            PackagingName = r.PackagingLoan?.Packaging?.Name ?? "",
            ReturnedQty = r.ReturnedQty,
            ReturnDate = r.ReturnDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            RecordedBy = r.RecordedBy,
            Note = r.Note
        }).ToList();

        return Ok(Result<List<PackagingReturnHistoryDto>>.Success(dtos));
    }

    /// <summary>
    /// Ghi nhận thu hồi / trả lại sọt nhựa
    /// </summary>
    [HttpPost("returns")]
    [HttpPost("/api/packaging-returns")]
    public async Task<ActionResult<Result<bool>>> CreateReturn([FromBody] CreateReturnDto dto, CancellationToken cancellationToken = default)
    {
        var loan = await _context.PackagingLoans.FirstOrDefaultAsync(l => l.Id == dto.LoanId && !l.IsDeleted, cancellationToken);
        if (loan == null)
        {
            return BadRequest(Result<bool>.Failure("Không tìm thấy thông tin mượn bao bì."));
        }

        loan.ReturnedQty = Math.Min(loan.LoanedQty, loan.ReturnedQty + dto.ReturnedQty);

        var ret = new PackagingReturn
        {
            PackagingLoanId = loan.Id,
            ReturnedQty = dto.ReturnedQty,
            ReturnDate = DateTime.UtcNow,
            RecordedBy = dto.RecordedBy,
            Note = dto.Note
        };

        _context.PackagingReturns.Add(ret);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<bool>.Success(true));
    }

    /// <summary>
    /// Điều chỉnh số lượng sọt (Nhập thêm sọt mới hoặc Báo hư hỏng / Báo mất sọt)
    /// </summary>
    [HttpPost("adjust-stock")]
    public async Task<ActionResult<Result<bool>>> AdjustStock([FromBody] AdjustPackagingStockDto dto, CancellationToken cancellationToken = default)
    {
        var pkg = await _context.Packagings.FirstOrDefaultAsync(p => p.Id == dto.PackagingId && !p.IsDeleted, cancellationToken);
        if (pkg == null)
        {
            return BadRequest(Result<bool>.Failure("Không tìm thấy thông tin sọt / bao bì."));
        }

        pkg.StockQuantity = Math.Max(0, pkg.StockQuantity + dto.AdjustmentQty);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<bool>.Success(true));
    }
}

public class AdjustPackagingStockDto
{
    public int PackagingId { get; set; }
    public int AdjustmentQty { get; set; } // Dương (+) là nhập thêm, Âm (-) là báo hỏng/mất
    public string Reason { get; set; } = string.Empty;
}
