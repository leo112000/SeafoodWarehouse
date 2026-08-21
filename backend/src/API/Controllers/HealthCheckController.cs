using Microsoft.AspNetCore.Mvc;

namespace SeafoodWarehouseManagement.API.Controllers;

[Route("api/[controller]")]
[Route("api")]
[Route("")]
public class HealthCheckController : BaseApiController
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            Status = "Healthy",
            System = "Seafood Warehouse Management System API",
            Version = "1.0.0",
            Documentation = "http://localhost:5260/scalar/v1",
            Timestamp = DateTime.UtcNow
        });
    }
}
