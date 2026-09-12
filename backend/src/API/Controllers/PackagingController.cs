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
    public int StockQuantity { get; set; } // Tồn kho tại chỗ
    public int LoanedQuantity { get; set; } // Đang cho mượn ngoài kho
    public int TotalQuantity { get; set; } // Tổng số lượng sở hữu thực tế (Tồn kho + Đang mượn)
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
            .Include(p => p.Loans.Where(l => !l.IsDeleted))
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .ToListAsync(cancellationToken);

        var dtos = packagings.Select(p =>
        {
            var activeLoaned = p.Loans.Sum(l => l.LoanedQty - l.ReturnedQty);
            return new PackagingDto
            {
                Id = p.Id.ToString(),
                Code = p.Code,
                Name = p.Name,
                Category = p.Category,
                DefaultTareWeight = p.DefaultTareWeight,
                Unit = p.Unit,
                StockQuantity = p.StockQuantity,
                LoanedQuantity = activeLoaned,
                TotalQuantity = p.StockQuantity + activeLoaned,
                Note = p.Note
            };
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
            LoanedQuantity = 0,
            TotalQuantity = packaging.StockQuantity,
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

        var activeLoaned = await _context.PackagingLoans
            .Where(l => l.PackagingId == packaging.Id && !l.IsDeleted)
            .SumAsync(l => l.LoanedQty - l.ReturnedQty, cancellationToken);

        var result = new PackagingDto
        {
            Id = packaging.Id.ToString(),
            Code = packaging.Code,
            Name = packaging.Name,
            Category = packaging.Category,
            DefaultTareWeight = packaging.DefaultTareWeight,
            Unit = packaging.Unit,
            StockQuantity = packaging.StockQuantity,
            LoanedQuantity = activeLoaned,
            TotalQuantity = packaging.StockQuantity + activeLoaned,
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
        if (dto.LoanedQty <= 0)
        {
            return BadRequest(Result<PackagingLoanDto>.Failure("Số lượng mượn phải lớn hơn 0."));
        }

        var pkg = await _context.Packagings.FirstOrDefaultAsync(p => p.Code == dto.PackagingCode && !p.IsDeleted, cancellationToken);
        if (pkg == null)
        {
            return BadRequest(Result<PackagingLoanDto>.Failure("Mã bao bì không tồn tại."));
        }

        if (pkg.StockQuantity < dto.LoanedQty)
        {
            return BadRequest(Result<PackagingLoanDto>.Failure($"Số lượng tồn kho không đủ để cho mượn (Hiện còn: {pkg.StockQuantity} {pkg.Unit}, yêu cầu: {dto.LoanedQty})."));
        }

        // Trừ số lượng tồn kho của bao bì khi cho mượn
        pkg.StockQuantity -= dto.LoanedQty;

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
        if (dto.ReturnedQty <= 0)
        {
            return BadRequest(Result<bool>.Failure("Số lượng trả phải lớn hơn 0."));
        }

        var loan = await _context.PackagingLoans
            .Include(l => l.Packaging)
            .FirstOrDefaultAsync(l => l.Id == dto.LoanId && !l.IsDeleted, cancellationToken);
        if (loan == null)
        {
            return BadRequest(Result<bool>.Failure("Không tìm thấy thông tin mượn bao bì."));
        }

        var remainingDebt = loan.LoanedQty - loan.ReturnedQty;
        if (dto.ReturnedQty > remainingDebt)
        {
            return BadRequest(Result<bool>.Failure($"Số lượng trả ({dto.ReturnedQty}) vượt quá số lượng còn nợ ({remainingDebt})."));
        }

        loan.ReturnedQty += dto.ReturnedQty;

        // Hoàn trả số lượng vào tồn kho của loại bao bì
        if (loan.Packaging != null)
        {
            loan.Packaging.StockQuantity += dto.ReturnedQty;
        }
        else
        {
            var pkg = await _context.Packagings.FirstOrDefaultAsync(p => p.Id == loan.PackagingId && !p.IsDeleted, cancellationToken);
            if (pkg != null)
            {
                pkg.StockQuantity += dto.ReturnedQty;
            }
        }

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

        if (dto.AdjustmentQty == 0)
        {
            return BadRequest(Result<bool>.Failure("Số lượng điều chỉnh không được bằng 0."));
        }

        var oldStock = pkg.StockQuantity;
        string actionType = dto.AdjustmentQty > 0 ? "ADD" : "LOSS";
        int qty = Math.Abs(dto.AdjustmentQty);

        // Báo hỏng / Báo mất (AdjustmentQty < 0)
        if (dto.AdjustmentQty < 0)
        {
            if (pkg.StockQuantity <= 0)
            {
                return BadRequest(Result<bool>.Failure($"Không thể báo hỏng do tồn kho tại chỗ hiện bằng 0 (Sọt đang cho mượn ngoài kho hoặc chưa có trong kho). Sọt phải có thực tế ở kho mới có thể báo hỏng."));
            }

            if (qty > pkg.StockQuantity)
            {
                return BadRequest(Result<bool>.Failure($"Số lượng báo hỏng ({qty} {pkg.Unit}) vượt quá số lượng sọt thực tế đang có trong kho (Hiện còn: {pkg.StockQuantity} {pkg.Unit})."));
            }

            pkg.StockQuantity -= qty;
        }
        else
        {
            // Nhập thêm sọt mới
            pkg.StockQuantity += qty;
        }

        var userName = !string.IsNullOrWhiteSpace(dto.PerformedBy) ? dto.PerformedBy : (User?.Identity?.Name ?? "Thủ kho");

        // Lưu vào bảng chuyên biệt PackagingAdjustments trong CSDL để truy soát
        var adjustment = new PackagingAdjustment
        {
            PackagingId = pkg.Id,
            AdjustmentType = actionType,
            Quantity = qty,
            BeforeStock = oldStock,
            AfterStock = pkg.StockQuantity,
            Reason = dto.Reason,
            AdjustedBy = userName,
            AdjustedAt = DateTime.UtcNow,
            TenantId = pkg.TenantId
        };
        _context.PackagingAdjustments.Add(adjustment);

        // Ghi thêm nhật ký AuditLog
        var auditLog = new AuditLog
        {
            Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            UserName = userName,
            UserRole = "Thủ kho",
            Action = actionType == "ADD" ? "PKG_IMPORT" : "PKG_LOSS",
            TargetModule = "Bao bì",
            Details = $"{(actionType == "ADD" ? "Nhập thêm" : "Báo hỏng / mất")} {qty} {pkg.Unit} {pkg.Name} ({pkg.Code}). Tồn kho: {oldStock} -> {pkg.StockQuantity}. Lý do: {dto.Reason}",
            OldValues = $"{{\"PackagingCode\":\"{pkg.Code}\",\"PackagingName\":\"{pkg.Name}\",\"Stock\":{oldStock}}}",
            NewValues = $"{{\"PackagingCode\":\"{pkg.Code}\",\"PackagingName\":\"{pkg.Name}\",\"Stock\":{pkg.StockQuantity},\"Quantity\":{qty},\"Reason\":\"{dto.Reason}\"}}",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
            Browser = HttpContext.Request.Headers["User-Agent"].ToString() ?? "Web Browser",
            Status = "SUCCESS"
        };
        _context.AuditLogs.Add(auditLog);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(Result<bool>.Success(true));
    }

    /// <summary>
    /// Lấy lịch sử điều chỉnh số lượng sọt (Nhập thêm sọt & Báo hỏng/mất) trực tiếp từ bảng PackagingAdjustments
    /// </summary>
    [HttpGet("adjust-history")]
    public async Task<ActionResult<Result<List<PackagingAdjustHistoryDto>>>> GetAdjustHistory([FromQuery] int? packagingId, CancellationToken cancellationToken = default)
    {
        var query = _context.PackagingAdjustments
            .Include(a => a.Packaging)
            .Where(a => !a.IsDeleted);

        if (packagingId.HasValue)
        {
            query = query.Where(a => a.PackagingId == packagingId.Value);
        }

        var list = await query
            .OrderByDescending(a => a.AdjustedAt)
            .Take(100)
            .Select(a => new PackagingAdjustHistoryDto
            {
                Id = a.Id.ToString(),
                Timestamp = a.AdjustedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                PackagingCode = a.Packaging != null ? a.Packaging.Code : "",
                PackagingName = a.Packaging != null ? a.Packaging.Name : "",
                Action = a.AdjustmentType,
                Quantity = a.Quantity,
                BeforeStock = a.BeforeStock,
                AfterStock = a.AfterStock,
                Reason = a.Reason ?? "",
                PerformedBy = a.AdjustedBy ?? "Thủ kho"
            })
            .ToListAsync(cancellationToken);

        return Ok(Result<List<PackagingAdjustHistoryDto>>.Success(list));
    }
}

public class AdjustPackagingStockDto
{
    public int PackagingId { get; set; }
    public int AdjustmentQty { get; set; } // Dương (+) là nhập thêm, Âm (-) là báo hỏng/mất
    public string Reason { get; set; } = string.Empty;
    public string? PerformedBy { get; set; }
}

public class PackagingAdjustHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string PackagingCode { get; set; } = string.Empty;
    public string PackagingName { get; set; } = string.Empty;
    public string Action { get; set; } = "ADD"; // ADD | LOSS
    public int Quantity { get; set; }
    public int BeforeStock { get; set; }
    public int AfterStock { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = "Thủ kho";
}
