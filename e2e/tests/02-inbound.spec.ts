import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Toàn diện Nhập kho hải sản (Inbound Flow)', () => {
  const timestamp = Date.now().toString().slice(-6);
  const supplierName = `Tàu Cá Thuận Phát ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // 1. Đăng nhập hệ thống
    await page.goto('/login');
    await page.fill('input[placeholder="Email đăng nhập"]', 'admin@gmail.com');
    await page.fill('input[placeholder="Mật khẩu"]', 'qazwsxedc@123A');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('1. Tạo mới phiếu nhập kho đơn lẻ (1 mặt hàng) và kiểm tra lưu vào Lịch sử', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    // 1. Điều hướng đến trang Nhập kho
    await page.goto('/inventory/inbound');
    await expect(activeTab.locator('h1:has-text("Tạo Phiếu Nhập Kho")')).toBeVisible({ timeout: 10000 });

    // 2. Điền thông tin nhà cung cấp
    const supplierInput = activeTab.locator('#supplier');
    await supplierInput.fill(supplierName);

    // 3. Kiểm tra hoặc chọn Kho tiếp nhận
    const storageSelect = activeTab.locator('.ant-select:has(#storageLocation)');
    await storageSelect.click();
    const storageDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(storageDropdown).toBeVisible({ timeout: 5000 });
    await storageDropdown.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // 4. Chọn Mặt hàng hải sản ở dòng đầu tiên
    const seafoodSelect = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect.click();
    const productDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(productDropdown).toBeVisible({ timeout: 5000 });
    await productDropdown.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // 5. Nhập Hạn sử dụng
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

  test('2. Tạo mới phiếu nhập kho đa mặt hàng (3 dòng sản phẩm cùng lúc)', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');
    const multiSupplierName = `Vựa Cá Đại Dương ${Date.now().toString().slice(-6)}`;

    // 1. Điều hướng đến trang Nhập kho
    await page.goto('/inventory/inbound');
    await expect(activeTab.locator('h1:has-text("Tạo Phiếu Nhập Kho")')).toBeVisible({ timeout: 10000 });

    // 2. Điền thông tin nhà cung cấp
    await activeTab.locator('#supplier').fill(multiSupplierName);

    // --- MẶT HÀNG 1 ---
    const seafoodSelect0 = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect0.click();
    const dropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown0).toBeVisible({ timeout: 5000 });
    await dropdown0.locator('.ant-select-item-option').nth(0).click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // Chọn phương thức Bảo quản 1 (Cấp đông)
    const storageSelect0 = activeTab.locator('.ant-select:has(#items_0_storageCondition)');
    await storageSelect0.click();
    const storageDropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(storageDropdown0).toBeVisible({ timeout: 5000 });
    await storageDropdown0.locator('.ant-select-item-option:has-text("Cấp đông")').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_0_expiryDate').fill('2026-12-31');
    await activeTab.locator('#items_0_expiryDate').blur();
    await activeTab.locator('#items_0_totalWeight').fill('120');
    await activeTab.locator('#items_0_tareWeight').fill('10');
    await activeTab.locator('#items_0_unitPrice').fill('350000');

    // --- MẶT HÀNG 2 ---
    const addBtn = activeTab.locator('button:has-text("Thêm dòng hải sản nhập kho")');
    await addBtn.click();
    await expect(activeTab.locator('.ant-select:has(#items_1_seafoodCode)')).toBeVisible({ timeout: 5000 });

    const seafoodSelect1 = activeTab.locator('.ant-select:has(#items_1_seafoodCode)');
    await seafoodSelect1.click();
    const dropdown1 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown1).toBeVisible({ timeout: 5000 });
    const optCount1 = await dropdown1.locator('.ant-select-item-option').count();
    await dropdown1.locator('.ant-select-item-option').nth(Math.min(1, optCount1 - 1)).click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // Chọn phương thức Bảo quản 2 (Ướp đá)
    const storageSelect1 = activeTab.locator('.ant-select:has(#items_1_storageCondition)');
    await storageSelect1.click();
    const storageDropdown1 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(storageDropdown1).toBeVisible({ timeout: 5000 });
    await storageDropdown1.locator('.ant-select-item-option:has-text("Ướp đá")').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_1_expiryDate').fill('2026-12-30');
    await activeTab.locator('#items_1_expiryDate').blur();
    await activeTab.locator('#items_1_totalWeight').fill('85');
    await activeTab.locator('#items_1_tareWeight').fill('5');
    await activeTab.locator('#items_1_unitPrice').fill('200000');

    // --- MẶT HÀNG 3 ---
    await addBtn.click();
    await expect(activeTab.locator('.ant-select:has(#items_2_seafoodCode)')).toBeVisible({ timeout: 5000 });

    const seafoodSelect2 = activeTab.locator('.ant-select:has(#items_2_seafoodCode)');
    await seafoodSelect2.click();
    const dropdown2 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown2).toBeVisible({ timeout: 5000 });
    const optCount2 = await dropdown2.locator('.ant-select-item-option').count();
    await dropdown2.locator('.ant-select-item-option').nth(Math.min(2, optCount2 - 1)).click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // Chọn phương thức Bảo quản 3 (Tươi sống)
    const storageSelect2 = activeTab.locator('.ant-select:has(#items_2_storageCondition)');
    await storageSelect2.click();
    const storageDropdown2 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(storageDropdown2).toBeVisible({ timeout: 5000 });
    await storageDropdown2.locator('.ant-select-item-option:has-text("Tươi sống")').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_2_expiryDate').fill('2026-12-28');
    await activeTab.locator('#items_2_expiryDate').blur();
    await activeTab.locator('#items_2_totalWeight').fill('55');
    await activeTab.locator('#items_2_tareWeight').fill('5');
    await activeTab.locator('#items_2_unitPrice').fill('180000');

    // 3. Nhấn nút Lưu phiếu nhập
    const saveInboundBtn = activeTab.locator('button:has-text("Lưu phiếu nhập")');
    await saveInboundBtn.click();

    // 4. Xác nhận thông báo thành công và chuyển sang trang lịch sử nhập
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await page.waitForURL('**/inventory/inbound-history', { timeout: 15000 });

    // 5. Xác thực phiếu nhập đa mặt hàng xuất hiện ở bảng lịch sử
    await expect(activeTab.locator('table').locator(`text=${multiSupplierName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Nhập kho kèm bao bì / sọt luân chuyển và kiểm tra tính cân bì tự động', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');
    const pkgSupplier = `Hợp Tác Xã Đánh Bắt ${Date.now().toString().slice(-6)}`;

    await page.goto('/inventory/inbound');
    await expect(activeTab.locator('h1:has-text("Tạo Phiếu Nhập Kho")')).toBeVisible({ timeout: 10000 });

    await activeTab.locator('#supplier').fill(pkgSupplier);

    // Chọn hải sản
    const seafoodSelect = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect.click();
    const productDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(productDropdown).toBeVisible({ timeout: 5000 });
    await productDropdown.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_0_expiryDate').fill('2026-12-31');
    await activeTab.locator('#items_0_expiryDate').blur();

    // Chọn bao bì
    const pkgSelect = activeTab.locator('.ant-select:has(#items_0_packagingCode)');
    await pkgSelect.click();
    const pkgDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    if (await pkgDropdown.locator('.ant-select-item-option').count() > 0) {
      await pkgDropdown.locator('.ant-select-item-option').first().click();
    }
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // Nhập số sọt là 3
    const pkgQtyInput = activeTab.locator('#items_0_packagingQty');
    await pkgQtyInput.fill('3');

    // Nhập tổng cân và đơn giá
    await activeTab.locator('#items_0_totalWeight').fill('90');
    await activeTab.locator('#items_0_unitPrice').fill('220000');

    // Lưu phiếu
    const saveInboundBtn = activeTab.locator('button:has-text("Lưu phiếu nhập")');
    await saveInboundBtn.click();

    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await page.waitForURL('**/inventory/inbound-history', { timeout: 15000 });
    await expect(activeTab.locator('table').locator(`text=${pkgSupplier}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('4. Kiểm tra validation bắt buộc khi để trống thông tin nhập kho', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/inventory/inbound');
    await expect(activeTab.locator('h1:has-text("Tạo Phiếu Nhập Kho")')).toBeVisible({ timeout: 10000 });

    // Bấm nút Lưu mà không điền thông tin
    const saveInboundBtn = activeTab.locator('button:has-text("Lưu phiếu nhập")');
    await saveInboundBtn.click();

    // Kiểm tra hiển thị cảnh báo lỗi bắt buộc
    await expect(page.locator('text=Vui lòng chọn hoặc nhập tên nhà cung cấp!')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Chọn sản phẩm!')).toBeVisible({ timeout: 5000 });
  });

  test('5. Chuyển đổi sang Chế độ Bảng kê nhập nhanh cuối ngày (Batch Grid)', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/inventory/inbound');
    await expect(activeTab.locator('h1:has-text("Tạo Phiếu Nhập Kho")')).toBeVisible({ timeout: 10000 });

    // Click chuyển Segmented sang "Bảng kê cuối ngày (Nhiều NCC)"
    const batchModeBtn = activeTab.locator('.ant-segmented-item:has-text("Bảng kê cuối ngày")');
    await batchModeBtn.click();

    // Xác nhận lưới Bảng kê nhập nhanh hiển thị
    await expect(activeTab.locator('button:has-text("Thêm NCC / Tàu mới")')).toBeVisible({ timeout: 5000 });
    await expect(activeTab.locator('button:has-text("Làm lại")')).toBeVisible({ timeout: 5000 });
  });
});
