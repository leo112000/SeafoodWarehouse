using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Application.DTOs.File;

namespace SeafoodWarehouseManagement.Infrastructure.Services;

/// <summary>
/// Triển khai lưu trữ file cục bộ (Local File Storage) trên đĩa cứng / wwwroot.
/// Có thể dễ dàng thay thế bằng CloudStorageService (AWS S3, Cloudinary) qua IFileStorageService.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _basePath;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(IConfiguration configuration, ILogger<LocalFileStorageService> logger)
    {
        _logger = logger;

        // Ưu tiên đường dẫn cấu hình, mặc định dùng thư mục wwwroot của ứng dụng
        var configuredPath = configuration["FileStorage:BasePath"];
        _basePath = !string.IsNullOrWhiteSpace(configuredPath)
            ? configuredPath
            : Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

        if (!Directory.Exists(_basePath))
        {
            Directory.CreateDirectory(_basePath);
        }
    }

    public async Task<FileUploadResultDto> UploadAsync(
        Stream fileStream,
        string originalFileName,
        string contentType,
        long fileLength,
        string folder = "uploads",
        CancellationToken cancellationToken = default)
    {
        // 1. Chuẩn hóa tên thư mục con, tránh Path Traversal
        var safeFolder = SanitizeFolder(folder);
        var targetDir = Path.Combine(_basePath, safeFolder);

        if (!Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        // 2. Tạo tên file duy nhất tránh xung đột hoặc ghi đè
        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        var uniqueFileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{extension}";
        var fullPhysicalPath = Path.Combine(targetDir, uniqueFileName);

        // 3. Ghi dữ liệu file ra đĩa
        using (var fileDestination = new FileStream(fullPhysicalPath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            if (fileStream.CanSeek)
            {
                fileStream.Position = 0;
            }
            await fileStream.CopyToAsync(fileDestination, cancellationToken);
        }

        _logger.LogInformation("Đã lưu trữ file thành công: {Path}", fullPhysicalPath);

        // 4. Đường dẫn URL tương đối (dùng cho client tải về hoặc hiển thị thẻ <img>)
        var relativeUrl = $"/{safeFolder.Replace('\\', '/')}/{uniqueFileName}";

        return new FileUploadResultDto
        {
            FileName = uniqueFileName,
            OriginalFileName = originalFileName,
            FileUrl = relativeUrl,
            RelativePath = Path.Combine(safeFolder, uniqueFileName),
            FileSizeBytes = fileLength,
            ContentType = contentType,
            UploadedAt = DateTime.UtcNow
        };
    }

    public Task<Stream?> GetFileStreamAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var safePath = SanitizeRelativePath(relativePath);
        var fullPhysicalPath = Path.Combine(_basePath, safePath);

        if (!File.Exists(fullPhysicalPath))
        {
            _logger.LogWarning("Không tìm thấy file tại đường dẫn: {Path}", fullPhysicalPath);
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = new FileStream(fullPhysicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    public Task<bool> DeleteAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        try
        {
            var safePath = SanitizeRelativePath(relativePath);
            var fullPhysicalPath = Path.Combine(_basePath, safePath);

            if (File.Exists(fullPhysicalPath))
            {
                File.Delete(fullPhysicalPath);
                _logger.LogInformation("Đã xóa file: {Path}", fullPhysicalPath);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa file: {Path}", relativePath);
            return Task.FromResult(false);
        }
    }

    private static string SanitizeFolder(string folder)
    {
        if (string.IsNullOrWhiteSpace(folder))
        {
            return "uploads";
        }

        var invalidChars = Path.GetInvalidPathChars();
        var sanitized = new string(folder.Where(c => !invalidChars.Contains(c) && c != '.' && c != '/' && c != '\\').ToArray());
        return string.IsNullOrWhiteSpace(sanitized) ? "uploads" : Path.Combine("uploads", sanitized);
    }

    private static string SanitizeRelativePath(string relativePath)
    {
        var clean = relativePath.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        // Loại bỏ các cú pháp lùi thư mục (Path traversal: ../)
        while (clean.Contains(".."))
        {
            clean = clean.Replace("..", string.Empty);
        }
        return clean;
    }
}
