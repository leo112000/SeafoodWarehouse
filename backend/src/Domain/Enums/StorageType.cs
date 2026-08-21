namespace SeafoodWarehouseManagement.Domain.Enums;

public enum StorageType
{
    ColdStorage = 1,      // Kho mát (0 - 4°C)
    FrozenStorage = 2,    // Kho đông (-18 - -25°C)
    DeepFreeze = 3,       // Kho cấp đông sâu (dưới -30°C)
    LiveTank = 4,         // Bể chứa hàng sống
    DryStorage = 5        // Kho khô (Bao bì, phụ gia)
}
