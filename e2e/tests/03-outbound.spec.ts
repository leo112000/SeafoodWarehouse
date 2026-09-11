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

  test('1. Tạo mới phiếu xuất kho theo chuẩn FEFO (đơn lẻ 1 mặt hàng)', async ({ page }) => {
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

  test('2. Xuất kho đa mặt hàng (xuất 2 đến 3 sản phẩm cùng lúc theo chuẩn FEFO)', async ({ page }) => {
    const multiCustomerName = `Đại Lý Hải Sản Đa Sản Phẩm ${Date.now().toString().slice(-6)}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    // 1. Điều hướng đến trang Xuất kho
    await page.goto('/inventory/outbound');
    await expect(activeTab.locator('text=Chi tiết hải sản xuất kho')).toBeVisible({ timeout: 10000 });

    // 2. Nhập thông tin Khách hàng
    await activeTab.locator('#customer').fill(multiCustomerName);
    await activeTab.locator('#customerPhone').fill('0988777666');

    // --- MẶT HÀNG 1 ---
    const seafoodSelect0 = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect0.click();
    const dropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown0).toBeVisible({ timeout: 5000 });
    const productCount = await dropdown0.locator('.ant-select-item-option').count();
    await dropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    const batchSelect0 = activeTab.locator('.ant-select:has(#items_0_batchCode)');
    await batchSelect0.click();
    const batchDropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(batchDropdown0).toBeVisible({ timeout: 5000 });
    await batchDropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_0_quantity').fill('1');

    // --- MẶT HÀNG 2 ---
    const addSeafoodBtn = activeTab.locator('button:has-text("Thêm mặt hàng hải sản xuất kho")');
    await addSeafoodBtn.click();
    await expect(activeTab.locator('.ant-select:has(#items_1_seafoodCode)')).toBeVisible({ timeout: 5000 });

    const seafoodSelect1 = activeTab.locator('.ant-select:has(#items_1_seafoodCode)');
    await seafoodSelect1.click();
    const dropdown1 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown1).toBeVisible({ timeout: 5000 });
    const optIdx1 = Math.min(1, productCount - 1);
    await dropdown1.locator('.ant-select-item-option').nth(optIdx1).click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    const batchSelect1 = activeTab.locator('.ant-select:has(#items_1_batchCode)');
    await batchSelect1.click();
    const batchDropdown1 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(batchDropdown1).toBeVisible({ timeout: 5000 });
    await batchDropdown1.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_1_quantity').fill('1');

    // --- MẶT HÀNG 3 (nếu có từ 3 sản phẩm trong kho) ---
    if (productCount >= 3) {
      await addSeafoodBtn.click();
      await expect(activeTab.locator('.ant-select:has(#items_2_seafoodCode)')).toBeVisible({ timeout: 5000 });

      const seafoodSelect2 = activeTab.locator('.ant-select:has(#items_2_seafoodCode)');
      await seafoodSelect2.click();
      const dropdown2 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      await expect(dropdown2).toBeVisible({ timeout: 5000 });
      await dropdown2.locator('.ant-select-item-option').nth(2).click();
      await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

      const batchSelect2 = activeTab.locator('.ant-select:has(#items_2_batchCode)');
      await batchSelect2.click();
      const batchDropdown2 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      await expect(batchDropdown2).toBeVisible({ timeout: 5000 });
      await batchDropdown2.locator('.ant-select-item-option').first().click();
      await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

      await activeTab.locator('#items_2_quantity').fill('1');
    }

    // 3. Nhấn nút Xác nhận xuất kho & In hóa đơn
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    // 4. Xác nhận thông báo thành công và Modal hóa đơn
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-modal-title:has-text("Phiếu Xuất Kho")')).toBeVisible({ timeout: 10000 });

    // 5. Đóng Modal hóa đơn
    const closeModalBtn = page.locator('.ant-modal-footer button:has-text("Đóng")');
    await closeModalBtn.click();
  });

  test('3. Xuất kho kèm sản phẩm phụ & phụ phí đóng gói (Thùng xốp, đá gel bảo quản)', async ({ page }) => {
    const customerName = `Nhà Hàng Kèm Phụ Kiện ${Date.now().toString().slice(-6)}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    // 1. Điều hướng đến trang Xuất kho
    await page.goto('/inventory/outbound');
    await expect(activeTab.locator('text=Chi tiết hải sản xuất kho')).toBeVisible({ timeout: 10000 });

    // 2. Nhập thông tin Khách hàng
    await activeTab.locator('#customer').fill(customerName);

    // 3. Chọn Mặt hàng hải sản xuất kho chính
    const seafoodSelect0 = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect0.click();
    const dropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown0).toBeVisible({ timeout: 5000 });
    await dropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    const batchSelect0 = activeTab.locator('.ant-select:has(#items_0_batchCode)');
    await batchSelect0.click();
    const batchDropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(batchDropdown0).toBeVisible({ timeout: 5000 });
    await batchDropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_0_quantity').fill('2');

    // 4. Thêm vật phẩm bán kèm / phụ phí đóng gói 1 (Thùng xốp)
    const addSupplyBtn = activeTab.locator('button:has-text("Thêm thùng xốp / đá gel / vật phẩm kèm")');
    await addSupplyBtn.click();
    await expect(activeTab.locator('.ant-select:has(#supplies_0_name)')).toBeVisible({ timeout: 5000 });

    const supplySelect0 = activeTab.locator('.ant-select:has(#supplies_0_name)');
    await supplySelect0.click();
    const supplyDropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(supplyDropdown0).toBeVisible({ timeout: 5000 });
    await supplyDropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#supplies_0_quantity').fill('2');
    await activeTab.locator('#supplies_0_unitPrice').fill('45000');

    // 5. Thêm vật phẩm bán kèm / phụ phí đóng gói 2 (Đá gel)
    await addSupplyBtn.click();
    await expect(activeTab.locator('.ant-select:has(#supplies_1_name)')).toBeVisible({ timeout: 5000 });

    const supplySelect1 = activeTab.locator('.ant-select:has(#supplies_1_name)');
    await supplySelect1.click();
    const supplyDropdown1 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(supplyDropdown1).toBeVisible({ timeout: 5000 });
    const supCount1 = await supplyDropdown1.locator('.ant-select-item-option').count();
    await supplyDropdown1.locator('.ant-select-item-option').nth(Math.min(1, supCount1 - 1)).click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#supplies_1_quantity').fill('5');
    await activeTab.locator('#supplies_1_unitPrice').fill('15000');

    // 6. Xác nhận xuất kho & In hóa đơn
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    // 7. Xác nhận thông báo thành công và Modal hóa đơn
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-modal-title:has-text("Phiếu Xuất Kho")')).toBeVisible({ timeout: 10000 });

    // 8. Đóng Modal hóa đơn
    const closeModalBtn = page.locator('.ant-modal-footer button:has-text("Đóng")');
    await closeModalBtn.click();
  });
});
