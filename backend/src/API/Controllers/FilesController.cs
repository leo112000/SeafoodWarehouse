using Microsoft.AspNetCore.Mvc;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.DTOs.File;

namespace SeafoodWarehouseManagement.API.Controllers;

/// <summary>
/// API quản lý tệp tin và hình ảnh (Upload, Download, Xóa file)
/// Thích hợp cho: Ảnh hải sản, giấy kiểm định chất lượng, hóa đơn/chứng từ, file Excel nhập liệu.
/// </summary>
[Route("api/[controller]")]
public class FilesController : BaseApiController
{
    private readonly IFileStorageService _fileStorageService;

    // Giới hạn dung lượng tối đa 15MB cho mỗi file
    private const long MaxFileSizeInBytes = 15 * 1024 * 1024;

    // Danh sách phần mở rộng được phép upload để đảm bảo an toàn bảo mật
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"
    };

    public FilesController(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    /// <summary>
    /// Tải lên 1 tệp tin hoặc hình ảnh
    /// </summary>
    /// <param name="file">Tệp tin cần tải lên</param>
    /// <param name="folder">Thư mục phân loại (ví dụ: products, certifications, invoices)</param>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<FileUploadResultDto>> Upload(
        IFormFile? file,
        [FromQuery] string folder = "general",
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn một tệp tin hợp lệ để tải lên." });
        }

        var validationError = ValidateFile(file);
        if (validationError != null)
        {
            return BadRequest(new { message = validationError });
        }

        using var stream = file.OpenReadStream();
        var result = await _fileStorageService.UploadAsync(
            stream,
            file.FileName,
            file.ContentType,
            file.Length,
            folder,
            cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// Tải lên nhiều tệp tin cùng lúc
    /// </summary>
    /// <param name="files">Danh sách các tệp tin</param>
    /// <param name="folder">Thư mục phân loại</param>
    [HttpPost("upload-multiple")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<List<FileUploadResultDto>>> UploadMultiple(
        List<IFormFile> files,
        [FromQuery] string folder = "general",
        CancellationToken cancellationToken = default)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn ít nhất một tệp tin." });
        }

        foreach (var file in files)
        {
            var validationError = ValidateFile(file);
            if (validationError != null)
            {
                return BadRequest(new { message = $"Tệp {file.FileName}: {validationError}" });
            }
        }

        var uploadedResults = new List<FileUploadResultDto>();

        foreach (var file in files)
        {
            using var stream = file.OpenReadStream();
            var result = await _fileStorageService.UploadAsync(
                stream,
                file.FileName,
                file.ContentType,
                file.Length,
                folder,
                cancellationToken);

            uploadedResults.Add(result);
        }

        return Ok(uploadedResults);
    }

    /// <summary>
    /// Tải tệp tin về hoặc xem trực tiếp
    /// </summary>
    /// <param name="path">Đường dẫn tương đối của file (ví dụ: uploads/products/xyz.jpg)</param>
    [HttpGet("download")]
    public async Task<IActionResult> Download([FromQuery] string path, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return BadRequest(new { message = "Đường dẫn file không được để trống." });
        }

        var stream = await _fileStorageService.GetFileStreamAsync(path, cancellationToken);
        if (stream == null)
        {
            return NotFound(new { message = "Không tìm thấy tệp tin yêu cầu." });
        }

        var fileName = Path.GetFileName(path);
        var contentType = GetContentType(fileName);

        return File(stream, contentType, fileName);
    }

    /// <summary>
    /// Xóa một tệp tin khỏi kho lưu trữ
    /// </summary>
    /// <param name="path">Đường dẫn tương đối của file cần xóa</param>
    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string path, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return BadRequest(new { message = "Đường dẫn file không được để trống." });
        }

        var success = await _fileStorageService.DeleteAsync(path, cancellationToken);
        if (!success)
        {
            return NotFound(new { message = "Không tìm thấy tệp tin hoặc xóa thất bại." });
        }

        return Ok(new { success = true, message = "Đã xóa tệp tin thành công." });
    }

    private static string? ValidateFile(IFormFile file)
    {
        if (file.Length > MaxFileSizeInBytes)
        {
            return $"Dung lượng tệp vượt quá mức cho phép ({MaxFileSizeInBytes / (1024 * 1024)}MB).";
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            return $"Định dạng tệp '{extension}' không được hỗ trợ. Chỉ chấp nhận các định dạng ảnh, pdf, excel, word.";
        }

        return null;
    }

    private static string GetContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".csv" => "text/csv",
            _ => "application/octet-stream"
        };
    }
}
