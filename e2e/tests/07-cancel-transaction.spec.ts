import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Tính năng Hủy phiếu & Hoàn nguyên tồn kho (Cancellation & Rollback)', () => {
  const timestamp = Date.now().toString().slice(-6);
  const supplierName = `NCC Test Hủy ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // Đăng nhập hệ thống
    await page.goto('/login');
    await page.fill('input[placeholder="Email đăng nhập"]', 'admin@gmail.com');
    await page.fill('input[placeholder="Mật khẩu"]', 'qazwsxedc@123A');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('Hủy phiếu nhập kho, kiểm tra trạng thái [ĐÃ HỦY] và giao diện mobile responsive', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    // 1. Tạo mới phiếu nhập kho để chuẩn bị dữ liệu hủy
    await page.goto('/inventory/inbound');
    await expect(activeTab.locator('h1:has-text("Tạo Phiếu Nhập Kho")')).toBeVisible({ timeout: 10000 });

    const supplierInput = activeTab.locator('#supplier');
    await supplierInput.fill(supplierName);

    const storageSelect = activeTab.locator('.ant-select:has(#storageLocation)');
    await storageSelect.click();
    const storageOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:has-text("Kho đông lạnh A1")').first();
    await storageOption.click();

    const seafoodSelect = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect.click();
    const productDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(productDropdown).toBeVisible({ timeout: 5000 });
    await productDropdown.locator('.ant-select-item-option').first().click();

    const expiryDateInput = activeTab.locator('#items_0_expiryDate');
    await expiryDateInput.fill('2026-12-31');
    await expiryDateInput.blur();

    const totalWeightInput = activeTab.locator('#items_0_totalWeight');
    await totalWeightInput.fill('60');

    const tareWeightInput = activeTab.locator('#items_0_tareWeight');
    await tareWeightInput.fill('10');

    const unitPriceInput = activeTab.locator('#items_0_unitPrice');
    await unitPriceInput.fill('200000');

    const saveInboundBtn = activeTab.locator('button:has-text("Lưu phiếu nhập")');
    await saveInboundBtn.click();
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await page.waitForURL('**/inventory/inbound-history', { timeout: 15000 });

    // Tìm dòng vừa tạo có tên nhà cung cấp
    const row = page.locator(`.ant-table-row:has-text("${supplierName}")`).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    // 3. Click vào hàng để mở modal chi tiết
    await row.click();
    const detailModal = page.locator('.ant-modal:has-text("Chi tiết phiếu giao dịch:")');
    await expect(detailModal).toBeVisible({ timeout: 5000 });

    // Nút "Hủy phiếu này" phải xuất hiện
    const cancelBtn = detailModal.locator('button:has-text("Hủy phiếu này")');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // 4. Modal xác nhận hủy hiện lên
    const confirmModal = page.locator('.ant-modal:has-text("Xác Nhận Hủy Phiếu")');
    await expect(confirmModal).toBeVisible({ timeout: 5000 });

    // Nhập lý do hủy
    const reasonInput = confirmModal.locator('textarea');
    await reasonInput.fill('Kiểm thử nhập sai số cân cần rollback');

    // Bấm nút "Xác Nhận Hủy & Hoàn Nguyên"
    const confirmCancelBtn = confirmModal.locator('button:has-text("Xác Nhận Hủy & Hoàn Nguyên")');
    await confirmCancelBtn.click();

    console.log('STEP 1: Waiting for success message');
    // Thông báo thành công
    await expect(page.locator('.ant-message-success:has-text("hoàn nguyên tồn kho thành công")')).toBeVisible({ timeout: 10000 });

    console.log('STEP 2: Checking cancelled row tag');
    // 5. Kiểm tra hàng vừa hủy hiển thị tag [ĐÃ HỦY]
    const cancelledRow = page.locator(`.ant-table-row:has-text("${supplierName}")`).first();
    await expect(cancelledRow.locator('.ant-tag:has-text("ĐÃ HỦY")')).toBeVisible({ timeout: 10000 });

    console.log('STEP 3: Resizing to mobile viewport');
    // 6. Kiểm tra giao diện trên thiết bị di động (Mobile Viewport 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    console.log('STEP 4: Checking mobile card');
    // Tìm thẻ Card mobile tương ứng
    const mobileCard = page.locator(`.border.rounded-xl:has-text("${supplierName}")`).first();
    await expect(mobileCard).toBeVisible({ timeout: 10000 });
    await expect(mobileCard.locator('.ant-tag:has-text("ĐÃ HỦY")')).toBeVisible();

    console.log('STEP 5: Clicking mobile card for detail');
    // Click vào card mobile để mở chi tiết
    await mobileCard.click();
    await expect(detailModal).toBeVisible({ timeout: 5000 });

    console.log('STEP 6: Checking alert banner and no cancel button');
    // Kiểm tra banner cảnh báo hủy phiếu hiển thị trong modal
    const alertBanner = detailModal.locator('div:has-text("PHIẾU GIAO DỊCH ĐÃ BỊ HỦY")').first();
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText('Kiểm thử nhập sai số cân cần rollback');

    // Nút "Hủy phiếu này" không còn hiển thị vì đã hủy rồi
    await expect(detailModal.locator('button:has-text("Hủy phiếu này")')).toHaveCount(0);

    console.log('STEP 7: Verifying Dashboard recent transactions table excludes cancelled transaction');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('h1:has-text("Tổng Quan")')).toBeVisible({ timeout: 10000 });

    // Bảng Lịch Sử Giao Dịch Mới Nhất trên Dashboard không được chứa giao dịch đã hủy
    const dashboardRecentTable = page.locator('.ant-card:has-text("Lịch Sử Giao Dịch") table');
    await expect(dashboardRecentTable.locator(`text=${supplierName}`)).toHaveCount(0);

    console.log('STEP 8: Test passed successfully');
  });
});
