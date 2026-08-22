using System.Text.Json.Serialization;
using Scalar.AspNetCore;
using SeafoodWarehouseManagement.API.Middleware;
using SeafoodWarehouseManagement.Application;
using SeafoodWarehouseManagement.Infrastructure;
using SeafoodWarehouseManagement.Infrastructure.Persistence;

using SeafoodWarehouseManagement.API.Hubs;
using SeafoodWarehouseManagement.API.Services;
using SeafoodWarehouseManagement.Application.Common.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, SignalRNotificationService>();
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Cấu hình CORS - Cho phép tất cả các Origin (kể cả Cloudflare Tunnel)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Chuyển Enum sang string thay vì số (dễ đọc hơn)
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

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseMiddleware<TenantMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();