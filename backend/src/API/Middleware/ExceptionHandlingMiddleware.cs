using System.Net;
using System.Text.Json;
using SeafoodWarehouseManagement.Domain.Exceptions;

namespace SeafoodWarehouseManagement.API.Middleware;

/// <summary>
/// Middleware xử lý exception tập trung
/// - Không lộ thông tin chi tiết exception ra client (bảo mật)
/// - Trả về response JSON thống nhất
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning(ex, "Resource not found: {Message}", ex.Message);
            await HandleExceptionAsync(context, HttpStatusCode.NotFound, ex.Message);
        }
        catch (BusinessException ex)
        {
            _logger.LogWarning(ex, "Business rule violation: {Message}", ex.Message);
            await HandleExceptionAsync(context, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            var errorMessage = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            await HandleExceptionAsync(context, HttpStatusCode.InternalServerError, errorMessage, ex.ToString());
        }
    }


    private static async Task HandleExceptionAsync(HttpContext context, HttpStatusCode statusCode, string message, string? details = null)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        // Chuẩn hóa JSON Envelope theo đặc tả chuẩn của ASP.NET Boilerplate (ABP Framework)
        var response = new
        {
            success = false,
            result = (object?)null,
            error = new
            {
                code = (int)statusCode,
                message = message,
                details = details,
                validationErrors = (object?)null
            },
            unAuthorizedRequest = statusCode == HttpStatusCode.Unauthorized,
            __abp = true,

            // Giữ lại các trường truyền thống để đảm bảo tương thích ngược
            StatusCode = (int)statusCode,
            Message = message,
            Timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        await context.Response.WriteAsync(json);
    }
}