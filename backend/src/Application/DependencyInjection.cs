using Microsoft.Extensions.DependencyInjection;
using SeafoodWarehouseManagement.Application.Services;
using SeafoodWarehouseManagement.Application.Services.Interfaces;

namespace SeafoodWarehouseManagement.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Đăng ký các service nghiệp vụ
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<ILotBatchService, LotBatchService>();
        services.AddScoped<IInventoryService, InventoryService>();

        return services;
    }
}