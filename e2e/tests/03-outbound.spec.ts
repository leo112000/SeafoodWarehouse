import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Xuất kho hải sản (Outbound FEFO Flow)', () => {
  const timestamp = Date.now().toString().slice(-6);
  const customerName = `Khách Hàng Xuất Kho ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // 1. Đăng nhập hệ thống
    await page.goto('/login');
    await page.fill('input[placeholder="Email đăng nhập"]', 'admin@gmail.com');
    await page.fill('input[placeholder="Mật khẩu"]', 'qazwsxedc@123A');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('Tạo mới phiếu xuất kho theo chuẩn FEFO và mở modal hóa đơn bàn giao', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    // 1. Điều hướng đến trang Xuất kho
    await page.goto('/inventory/outbound');
    await expect(activeTab.locator('text=Chi tiết hải sản xuất kho')).toBeVisible({ timeout: 10000 });

    // 2. Nhập thông tin Khách hàng
    const customerInput = activeTab.locator('#customer');
    await customerInput.fill(customerName);

    // 3. Chọn Loại hải sản để xuất
    const outboundSeafoodSelect = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await outboundSeafoodSelect.click();
    const outboundProductDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(outboundProductDropdown).toBeVisible({ timeout: 5000 });
    await outboundProductDropdown.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // 4. Chọn Lô hàng theo thứ tự ưu tiên FEFO
    const batchSelect = activeTab.locator('.ant-select:has(#items_0_batchCode)');
    await batchSelect.click();
    const batchDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(batchDropdown).toBeVisible({ timeout: 5000 });
    await batchDropdown.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // 5. Nhập Số lượng xuất (1 kg để luôn hợp lệ với mọi hạn mức tồn kho FEFO)
    const quantityInput = activeTab.locator('#items_0_quantity');
    await quantityInput.fill('1');

    // 6. Nhấn nút Xác nhận xuất kho & In hóa đơn
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    // 7. Xác nhận thông báo xuất kho thành công và Modal hóa đơn mở ra
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-modal-title:has-text("Phiếu Xuất Kho")')).toBeVisible({ timeout: 10000 });

    // 8. Đóng Modal hóa đơn
    const closeModalBtn = page.locator('.ant-modal-footer button:has-text("Đóng")');
    await closeModalBtn.click();

    // 9. Xác nhận chuyển tiếp sang trang báo cáo tồn kho bình thường
    await page.goto('/inventory');
    await expect(activeTab.locator('.ant-table-tbody')).toBeVisible({ timeout: 10000 });
  });
});
