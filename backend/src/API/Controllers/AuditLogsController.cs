using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.Common.Models;
using SeafoodWarehouseManagement.Domain.Entities;

namespace SeafoodWarehouseManagement.API.Controllers;

public class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string TargetModule { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string IpAddress { get; set; } = "127.0.0.1";
    public string Browser { get; set; } = "Chrome 127 / Windows 11";
    public string Status { get; set; } = "SUCCESS";
    public int ExecutionDurationMs { get; set; } = 45;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
}

public class CreateAuditLogRequest
{
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = "Nhân viên";
    public string Action { get; set; } = "UPDATE";
    public string TargetModule { get; set; } = "Kho hàng";
    public string Details { get; set; } = string.Empty;
    public string IpAddress { get; set; } = "127.0.0.1";
    public string Browser { get; set; } = "Chrome 127 / Windows 11";
    public string Status { get; set; } = "SUCCESS";
}

/// <summary>
/// API Quản lý Nhật ký Hoạt động Hệ thống (Audit Logs) kết nối CSDL AuditLogs
/// </summary>
[Route("api/[controller]")]
public class AuditLogsController : BaseApiController
{
    private readonly IApplicationDbContext _context;

    public AuditLogsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách nhật ký hệ thống từ bảng AuditLogs trong CSDL
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Result<List<AuditLogDto>>>> GetLogs(CancellationToken cancellationToken = default)
    {
        var logs = await _context.AuditLogs
            .Where(l => !l.IsDeleted)
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .Select(l => new AuditLogDto
            {
                Id = l.Id.ToString(),
                Timestamp = l.Timestamp,
                UserName = l.UserName,
                UserRole = l.UserRole,
                Action = l.Action,
                TargetModule = l.TargetModule,
                Details = l.Details,
                IpAddress = l.IpAddress,
                Browser = l.Browser,
                Status = l.Status,
                ExecutionDurationMs = l.ExecutionDurationMs,
                OldValues = l.OldValues,
                NewValues = l.NewValues,
            })
            .ToListAsync(cancellationToken);

        // Seed dữ liệu khởi tạo nếu bảng AuditLogs mới tạo chưa có bản ghi nào
        if (logs.Count == 0)
        {
            var defaultLogs = new List<AuditLog>
            {
                new AuditLog
                {
                    Timestamp = DateTime.Now.ToString("yyyy-MM-DD HH:mm:ss"),
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
                new AuditLog
                {
                    Timestamp = DateTime.Now.AddMinutes(-25).ToString("yyyy-MM-DD HH:mm:ss"),
                    UserName = "Nguyễn Văn Thủ Kho",
                    UserRole = "Thủ kho",
                    Action = "CREATE",
                    TargetModule = "Nhập kho",
                    Details = "Tạo mới phiếu nhập kho hải sản PNK-20260820-001 (150kg Tôm hùm)",
                    IpAddress = "192.168.1.15",
                    Browser = "Edge 126 / Windows 10",
                    Status = "SUCCESS",
                    ExecutionDurationMs = 85,
                },
                new AuditLog
                {
                    Timestamp = DateTime.Now.AddHours(-2).ToString("yyyy-MM-DD HH:mm:ss"),
                    UserName = "Trần Thị Kế Toán",
                    UserRole = "Quản lý",
                    Action = "EXPORT",
                    TargetModule = "Báo cáo",
                    Details = "Xuất báo cáo tổng hợp tồn kho và doanh thu tháng 8/2026 ra Excel",
                    IpAddress = "192.168.1.20",
                    Browser = "Safari 17 / macOS",
                    Status = "SUCCESS",
                    ExecutionDurationMs = 240,
                },
            };

            await _context.AuditLogs.AddRangeAsync(defaultLogs, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            logs = defaultLogs.Select(l => new AuditLogDto
            {
                Id = l.Id.ToString(),
                Timestamp = l.Timestamp,
                UserName = l.UserName,
                UserRole = l.UserRole,
                Action = l.Action,
                TargetModule = l.TargetModule,
                Details = l.Details,
                IpAddress = l.IpAddress,
                Browser = l.Browser,
                Status = l.Status,
                ExecutionDurationMs = l.ExecutionDurationMs,
            }).ToList();
        }

        return Ok(Result<List<AuditLogDto>>.Success(logs));
    }

    /// <summary>
    /// Ghi nhận 1 hành động mới vào Nhật ký hệ thống (AuditLogs Table)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Result<AuditLogDto>>> CreateLog([FromBody] CreateAuditLogRequest request, CancellationToken cancellationToken = default)
    {
        var log = new AuditLog
        {
            Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            UserName = request.UserName,
            UserRole = request.UserRole,
            Action = request.Action,
            TargetModule = request.TargetModule,
            Details = request.Details,
            IpAddress = request.IpAddress,
            Browser = request.Browser,
            Status = request.Status,
            ExecutionDurationMs = new Random().Next(30, 150),
        };

        await _context.AuditLogs.AddAsync(log, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new AuditLogDto
        {
            Id = log.Id.ToString(),
            Timestamp = log.Timestamp,
            UserName = log.UserName,
            UserRole = log.UserRole,
            Action = log.Action,
            TargetModule = log.TargetModule,
            Details = log.Details,
            IpAddress = log.IpAddress,
            Browser = log.Browser,
            Status = log.Status,
            ExecutionDurationMs = log.ExecutionDurationMs,
        };

        return Ok(Result<AuditLogDto>.Success(dto));
    }
}
