import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Toàn diện Xuất kho hải sản (Outbound FEFO Flow)', () => {
  const timestamp = Date.now().toString().slice(-6);
  const customerName = `Nhà Hàng Biển Đông ${timestamp}`;

  test.beforeEach(async ({ page, request }) => {
    // 1. Đăng nhập hệ thống
    await page.goto('/login');
    await page.fill('#login_form_email', 'admin@gmail.com');
    await page.fill('#login_form_password', 'qazwsxedc@123A');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // 2. Đảm bảo kho luôn có ít nhất 1-2 lô hàng khả dụng để xuất kho
    const fefoRes = await request.get('http://localhost:5000/api/batch/fefo');
    if (fefoRes.ok()) {
      const batches = await fefoRes.json();
      if (!Array.isArray(batches) || batches.length === 0) {
        // Tạo nhanh 1 phiếu nhập kho mẫu qua API để có hàng cho Outbound test
        await request.post('http://localhost:5000/api/inbound', {
          data: {
            supplier: 'Vựa Cung Cấp Chuẩn Bị Tồn Kho Test',
            storageLocation: 'Kho chính',
            items: [
              {
                seafoodCode: 'HS-CA-THU',
                seafoodName: 'Cá Thu Tươi Cảng',
                totalWeight: 100,
                tareWeight: 5,
                netWeight: 95,
                storageCondition: 'Cấp đông',
                expiryDate: '2026-12-31',
                unitPrice: 240000,
                totalPrice: 22800000,
              },
              {
                seafoodCode: 'HS-TOM-SUT',
                seafoodName: 'Tôm Sú Cấp Đông',
                totalWeight: 60,
                tareWeight: 4,
                netWeight: 56,
                storageCondition: 'Cấp đông',
                expiryDate: '2026-11-30',
                unitPrice: 320000,
                totalPrice: 17920000,
              },
            ],
          },
        });
      }
    }
  });

  test('1. Tạo mới phiếu xuất kho 1 mặt hàng theo chuẩn FEFO', async ({ page }) => {
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

    // 4. Kiểm tra Lô hàng đã tự động được chọn theo chuẩn FEFO hoặc chọn từ danh sách
    const batchSelect = activeTab.locator('.ant-select:has(#items_0_batchCode)');
    if (await batchSelect.locator('.ant-select-selection-item').count() === 0) {
      await batchSelect.click();
      const batchDropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
      await expect(batchDropdown).toBeVisible({ timeout: 5000 });
      await batchDropdown.locator('.ant-select-item-option').first().click();
      await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);
    }

    // 5. Nhập Số lượng xuất
    const quantityInput = activeTab.locator('#items_0_quantity');
    await quantityInput.fill('2');

    // 6. Nhấn nút Xác nhận xuất kho & In hóa đơn
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    // 7. Xác nhận thông báo xuất kho thành công và Modal hóa đơn mở ra
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-modal-title:has-text("Phiếu Xuất Kho")')).toBeVisible({ timeout: 10000 });

    // 8. Đóng Modal hóa đơn
    const closeModalBtn = page.locator('.ant-modal-footer button:has-text("Đóng")');
    await closeModalBtn.click();
  });

  test('2. Tạo mới phiếu xuất kho đa mặt hàng (2 lô hàng cùng lúc)', async ({ page }) => {
    const multiCustomerName = `Đại Lý Hải Sản Tân Cảng ${Date.now().toString().slice(-6)}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/inventory/outbound');
    await expect(activeTab.locator('text=Chi tiết hải sản xuất kho')).toBeVisible({ timeout: 10000 });

    await activeTab.locator('#customer').fill(multiCustomerName);
    await activeTab.locator('#customerPhone').fill('0912 345 678');

    // --- MẶT HÀNG 1 ---
    const seafoodSelect0 = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect0.click();
    const dropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown0).toBeVisible({ timeout: 5000 });
    const productCount = await dropdown0.locator('.ant-select-item-option').count();
    await dropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_0_quantity').fill('1.5');

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

    await activeTab.locator('#items_1_quantity').fill('2');

    // Xác nhận xuất kho & In hóa đơn
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-modal-title:has-text("Phiếu Xuất Kho")')).toBeVisible({ timeout: 10000 });

    const closeModalBtn = page.locator('.ant-modal-footer button:has-text("Đóng")');
    await closeModalBtn.click();
  });

  test('3. Xuất kho kèm vật phẩm phụ & phụ phí đóng gói (Thùng xốp, đá gel)', async ({ page }) => {
    const customerName = `Nhà Hàng Kèm Thùng Xốp ${Date.now().toString().slice(-6)}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/inventory/outbound');
    await expect(activeTab.locator('text=Chi tiết hải sản xuất kho')).toBeVisible({ timeout: 10000 });

    await activeTab.locator('#customer').fill(customerName);

    // Chọn mặt hàng hải sản chính
    const seafoodSelect0 = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect0.click();
    const dropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown0).toBeVisible({ timeout: 5000 });
    await dropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_0_quantity').fill('3');

    // Thêm vật phẩm kèm 1 (Thùng xốp)
    const addSupplyBtn = activeTab.locator('button:has-text("Thêm vật phẩm / phụ phí")');
    await addSupplyBtn.click();
    await expect(activeTab.locator('#supplies_0_name')).toBeVisible({ timeout: 5000 });

    await activeTab.locator('#supplies_0_name').fill('Thùng xốp 30kg tiêu chuẩn');
    await activeTab.locator('#supplies_0_quantity').fill('2');
    await activeTab.locator('#supplies_0_unitPrice').fill('45000');

    // Thêm vật phẩm kèm 2 (Đá gel bảo quản)
    await addSupplyBtn.click();
    await expect(activeTab.locator('#supplies_1_name')).toBeVisible({ timeout: 5000 });

    await activeTab.locator('#supplies_1_name').fill('Đá gel bảo quản lạnh 500g');
    await activeTab.locator('#supplies_1_quantity').fill('5');
    await activeTab.locator('#supplies_1_unitPrice').fill('15000');

    // Xác nhận xuất kho & In hóa đơn
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-modal-title:has-text("Phiếu Xuất Kho")')).toBeVisible({ timeout: 10000 });

    const closeModalBtn = page.locator('.ant-modal-footer button:has-text("Đóng")');
    await closeModalBtn.click();
  });

  test('4. Xuất kho có áp dụng Chiết khấu / Giảm giá (Discount)', async ({ page }) => {
    const discountCustomer = `Khách Hàng Thân Thiết ${Date.now().toString().slice(-6)}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/inventory/outbound');
    await expect(activeTab.locator('text=Chi tiết hải sản xuất kho')).toBeVisible({ timeout: 10000 });

    await activeTab.locator('#customer').fill(discountCustomer);

    const seafoodSelect0 = activeTab.locator('.ant-select:has(#items_0_seafoodCode)');
    await seafoodSelect0.click();
    const dropdown0 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    await expect(dropdown0).toBeVisible({ timeout: 5000 });
    await dropdown0.locator('.ant-select-item-option').first().click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    await activeTab.locator('#items_0_quantity').fill('5');

    // Nhập chiết khấu và lý do giảm giá
    await activeTab.locator('#discountAmount').fill('50000');
    await activeTab.locator('#discountReason').fill('Khách hàng thân thiết VIP');

    // Xác nhận xuất kho
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-modal-title:has-text("Phiếu Xuất Kho")')).toBeVisible({ timeout: 10000 });

    const closeModalBtn = page.locator('.ant-modal-footer button:has-text("Đóng")');
    await closeModalBtn.click();
  });

  test('5. Kiểm tra validation bắt buộc khi để trống thông tin xuất kho', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/inventory/outbound');
    await expect(activeTab.locator('text=Chi tiết hải sản xuất kho')).toBeVisible({ timeout: 10000 });

    // Không nhập tên khách hàng, bấm Xác nhận xuất kho
    const saveOutboundBtn = activeTab.locator('button:has-text("Xác nhận xuất kho")');
    await saveOutboundBtn.click();

    // Hiển thị cảnh báo validation
    await expect(page.locator('text=Vui lòng nhập tên người nhận!')).toBeVisible({ timeout: 5000 });
  });
});
