using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SeafoodWarehouseManagement.Application.Common.Interfaces;
using SeafoodWarehouseManagement.Domain.Interfaces;
using SeafoodWarehouseManagement.Infrastructure.Persistence;
using SeafoodWarehouseManagement.Infrastructure.Repositories;

namespace SeafoodWarehouseManagement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Server=(localdb)\\mssqllocaldb;Database=SeafoodWarehouseDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

        // Tự động nhận diện Supabase / PostgreSQL hoặc SQL Server
        bool isPostgreSql = connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase) ||
                            connectionString.Contains("postgres", StringComparison.OrdinalIgnoreCase) ||
                            connectionString.Contains("5432") ||
                            connectionString.Contains("Username=", StringComparison.OrdinalIgnoreCase) ||
                            connectionString.Contains("User Id=postgres", StringComparison.OrdinalIgnoreCase);

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            if (isPostgreSql)
            {
                options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));
            }
            else
            {
                options.UseSqlServer(connectionString, b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));
            }
        });

        services.AddHttpContextAccessor();
        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<ApplicationDbContextInitialiser>();
        services.AddScoped<ICurrentTenant, SeafoodWarehouseManagement.Infrastructure.Services.CurrentTenantService>();
        services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Caching Architecture: Hybrid Redis với DistributedMemoryCache fallback
        var redisConn = configuration.GetConnectionString("Redis") ?? configuration["Redis:Configuration"];
        if (!string.IsNullOrWhiteSpace(redisConn))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConn;
                options.InstanceName = "SeafoodWarehouse_";
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        services.AddSingleton<ICacheService, SeafoodWarehouseManagement.Infrastructure.Services.DistributedCacheService>();

        return services;
    }
}
