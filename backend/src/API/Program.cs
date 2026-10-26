using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using SeafoodWarehouseManagement.API.BackgroundServices;
using SeafoodWarehouseManagement.API.Hubs;
using SeafoodWarehouseManagement.API.Middleware;
using SeafoodWarehouseManagement.API.Services;
using SeafoodWarehouseManagement.Application;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Infrastructure;
using SeafoodWarehouseManagement.Infrastructure.Persistence;

// Hỗ trợ lưu trữ DateTime tương thích PostgreSQL (Npgsql) trên Render/Supabase
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, SignalRNotificationService>();
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Đăng ký Background Service chạy tác vụ ngầm định kỳ
builder.Services.AddHostedService<WarehouseCheckBackgroundService>();

// 1. Cấu hình Chuẩn JWT Authentication & Verification
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey) || Encoding.UTF8.GetByteCount(jwtSecretKey) < 32)
{
    throw new InvalidOperationException("CRITICAL SECURITY ERROR: 'Jwt:SecretKey' chưa được cấu hình hoặc độ dài chưa đủ 256 bits (32 bytes). Vui lòng thiết lập biến môi trường 'Jwt__SecretKey'.");
}
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SeafoodWarehouseAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SeafoodWarehouseClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // Cho phép SignalR trích xuất Token từ query string access_token
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 2. Cấu hình Rate Limiting (Chống Brute-force và DDoS theo từng IP Client độc lập)
var isDevOrTest = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing");
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string GetClientIp(HttpContext httpContext)
    {
        return httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
               ?? httpContext.Connection.RemoteIpAddress?.ToString()
               ?? "anonymous";
    }

    options.AddPolicy("api-limiter", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIp(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = isDevOrTest ? 20000 : 120, // 120 req/phút trên mỗi IP
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = isDevOrTest ? 1000 : 20
            }));

    options.AddPolicy("auth-limiter", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIp(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = isDevOrTest ? 5000 : 15, // 15 lần login/phút trên mỗi IP
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = isDevOrTest ? 500 : 2
            }));
});

// Cấu hình CORS chặt chẽ: chỉ cho phép Vercel và local development
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "https://seafood-warehouse.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4200",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    };

var cleanOrigins = configuredOrigins
    .Where(o => !string.IsNullOrWhiteSpace(o))
    .Select(o => o.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(cleanOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// .NET 10 built-in OpenAPI support
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, _) =>
    {
        document.Info = new()
        {
            Title = "Seafood Warehouse Management API",
            Version = "v1",
            Description = "API quản lý kho thủy hải sản - Hệ thống nhập/xuất kho, lô hàng, và kiểm kê tồn kho."
        };
        return Task.CompletedTask;
    });
});

var app = builder.Build();

// Khởi tạo Database SQL Server và dữ liệu mẫu nếu chưa có
using (var scope = app.Services.CreateScope())
{
    var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();
    await initialiser.InitialiseAsync();
    await initialiser.SeedAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // OpenAPI JSON endpoint: /openapi/v1.json
    app.MapOpenApi();

    // Scalar API UI: /scalar/v1
    app.MapScalarApiReference(options =>
    {
        options.Title = "Seafood Warehouse API";
        options.Theme = ScalarTheme.DeepSpace;
        options.DefaultHttpClient = new(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

// 3. Bảo mật HTTP Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>();
app.UseAuthorization();
app.MapControllers().RequireRateLimiting("api-limiter");
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();