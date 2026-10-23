using SeafoodWarehouseManagement.Application.DTOs.File;

namespace SeafoodWarehouseManagement.Application.Common.Interfaces;

public interface IFileStorageService
{
    /// <summary>
    /// Lưu trữ file từ Stream và trả về thông tin metadata tệp đã upload
    /// </summary>
    Task<FileUploadResultDto> UploadAsync(
        Stream fileStream,
        string originalFileName,
        string contentType,
        long fileLength,
        string folder = "uploads",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Đọc Stream của file theo đường dẫn tương đối
    /// </summary>
    Task<Stream?> GetFileStreamAsync(string relativePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Xóa file khỏi hệ thống lưu trữ
    /// </summary>
    Task<bool> DeleteAsync(string relativePath, CancellationToken cancellationToken = default);
}
