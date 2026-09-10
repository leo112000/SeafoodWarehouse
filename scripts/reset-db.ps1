Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   DANG XOA VA KHOI TAO LAI CSDL        " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$sql = "IF DB_ID('SeafoodWarehouseDb') IS NOT NULL BEGIN ALTER DATABASE [SeafoodWarehouseDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [SeafoodWarehouseDb]; PRINT 'Xoa thanh cong Database SeafoodWarehouseDb.'; END"

try {
    & sqlcmd -S "(localdb)\mssqllocaldb" -Q $sql
    Write-Host "-> Da xoa sach CSDL SeafoodWarehouseDb thanh cong!" -ForegroundColor Green
} catch {
    Write-Host "-> Loi khi xoa CSDL: $_" -ForegroundColor Red
}

Write-Host "=========================================" -ForegroundColor Cyan
