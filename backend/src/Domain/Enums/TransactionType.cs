namespace SeafoodWarehouseManagement.Domain.Enums;

public enum TransactionType
{
    Import = 1,          // Nhập kho
    Export = 2,          // Xuất kho
    Transfer = 3,        // Chuyển vị trí/kho
    Adjustment = 4,      // Điều chỉnh kiểm kê
    Disposal = 5         // Hủy/Hao hụt
}
