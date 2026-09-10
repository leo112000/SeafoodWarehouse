import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Nhập kho hải sản (Inbound Flow)', () => {
  const timestamp = Date.now().toString().slice(-6);
  const supplierName = `NCC Nhập Kho ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // 1. Đăng nhập hệ thống
    await page.goto('/login');
    await page.fill('input[placeholder="Email đăng nhập"]', 'admin@gmail.com');
    await page.fill('input[placeholder="Mật khẩu"]', 'qazwsxedc@123A');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('Tạo mới phiếu nhập kho và xác nhận trong lịch sử giao dịch', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    // 1. Điều hướng đến trang Nhập kho
    await page.goto('/inventory/inbound');
    await expect(activeTab.locator('h1:has-text("Tạo Phiếu Nhập Kho")')).toBeVisible({ timeout: 10000 });

    // 2. Điền thông tin nhà cung cấp
    const supplierInput = activeTab.locator('#supplier');
    await supplierInput.fill(supplierName);

    // 3. Chọn Kho / Tủ đông tiếp nhận
    const storageSelect = activeTab.locator('.ant-select:has(#storageLocation)');
    await storageSelect.click();
    const storageOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:has-text("Kho đông lạnh A1")').first();
    await storageOption.click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // 4. Chọn Mặt hàng hải sản ở dòng đầu tiên
    const seafoodSelect = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect.click();
    const productDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(productDropdown).toBeVisible({ timeout: 5000 });
    await productDropdown.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // 5. Nhập Hạn sử dụng (Bắt buộc)
    const expiryDateInput = activeTab.locator('#items_0_expiryDate');
    await expiryDateInput.fill('2026-12-31');
    await expiryDateInput.blur();

    // 6. Nhập Cân thô và Cân bì (Gross: 105kg, Tare: 5kg => Net tự tính: 100kg)
    const totalWeightInput = activeTab.locator('#items_0_totalWeight');
    await totalWeightInput.fill('105');

    const tareWeightInput = activeTab.locator('#items_0_tareWeight');
    await tareWeightInput.fill('5');

    // 7. Nhập Đơn giá
    const unitPriceInput = activeTab.locator('#items_0_unitPrice');
    await unitPriceInput.fill('250000');

    // 8. Nhấn nút Lưu phiếu nhập
    const saveInboundBtn = activeTab.locator('button:has-text("Lưu phiếu nhập")');
    await saveInboundBtn.click();

    // 9. Xác nhận thông báo thành công và chuyển sang trang lịch sử nhập
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await page.waitForURL('**/inventory/inbound-history', { timeout: 15000 });

    // 10. Xác thực phiếu nhập vừa tạo xuất hiện ở bảng lịch sử giao dịch
    await expect(activeTab.locator('table').locator(`text=${supplierName}`).first()).toBeVisible({ timeout: 10000 });
  });
});
