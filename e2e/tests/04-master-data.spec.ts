import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Quản lý Dữ liệu nền (Master Data)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Đăng nhập hệ thống
    await page.goto('/login');
    await expect(page.locator('input[placeholder="Email đăng nhập"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="Email đăng nhập"]', 'admin@gmail.com');
    await page.fill('input[placeholder="Mật khẩu"]', 'qazwsxedc@123A');
    await page.click('button:has-text("Đăng nhập")');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  });

  test('1. Thêm mới Nhóm danh mục hải sản (/master-data/categories)', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-6);
    const categoryName = `Nhóm Test ${timestamp}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/master-data/categories');
    await expect(activeTab.locator('h1:has-text("Nhóm Danh Mục")')).toBeVisible({ timeout: 10000 });

    // Mở modal Thêm danh mục
    const addBtn = activeTab.locator('button:has-text("Thêm Danh Mục")');
    await addBtn.click();

    // Điền form thông tin nhóm danh mục
    const modal = page.locator('.ant-modal:visible');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('#name').fill(categoryName);
    await modal.locator('#code').fill(`CAT_${timestamp}`);
    await modal.locator('#description').fill('Mô tả nhóm kiểm thử tự động');

    // Nhấn Lưu
    await modal.locator('button:has-text("Thêm danh mục")').click();

    // Xác nhận thông báo thành công và hiển thị trong bảng
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(activeTab.locator('table').locator(`text=${categoryName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Thêm mới Danh mục hải sản (/master-data/products)', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-6);
    const productName = `Cá Thu Test ${timestamp}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/master-data/products');
    await expect(activeTab.locator('h1:has-text("Danh Mục Hải Sản")')).toBeVisible({ timeout: 10000 });

    // Mở modal Thêm hải sản
    const addBtn = activeTab.locator('button:has-text("Thêm Sản Phẩm Mới")');
    await addBtn.click();

    const modal = page.locator('.ant-modal:visible');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Điền thông tin cơ bản
    await modal.locator('#name').fill(productName);
    await modal.locator('#code').fill(`SP_${timestamp}`);

    // Chọn Nhóm danh mục
    const catSelect = modal.locator('.ant-select:has(#categoryId)');
    await catSelect.click();
    const catOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
    await catOption.click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // Điền đơn vị tính, nhiệt độ, giá tham chiếu và định mức tồn
    await modal.locator('input#unit').fill('Kg');
    await modal.locator('#targetTemperature').fill('-18');
    await modal.locator('#referencePrice').fill('350000');
    await modal.locator('#minStock').fill('10');
    await modal.locator('#maxStock').fill('500');

    // Nhấn Lưu
    await modal.locator('button:has-text("Thêm sản phẩm")').click();

    // Xác nhận thông báo thành công và hiển thị trong bảng
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(activeTab.locator('table').locator(`text=${productName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Thêm mới Danh mục bao bì / sọt (/master-data/packaging)', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-6);
    const packagingName = `Sọt Nhựa Test ${timestamp}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/master-data/packaging');
    await expect(activeTab.locator('h1:has-text("Danh Mục Bao Bì")')).toBeVisible({ timeout: 10000 });

    // Mở modal Thêm bao bì
    const addBtn = activeTab.locator('button:has-text("Thêm Mới")');
    await addBtn.click();

    const modal = page.locator('.ant-modal:visible');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Điền tên và trọng lượng bì
    await modal.locator('#name').fill(packagingName);
    await modal.locator('#code').fill(`PKG_${timestamp}`);
    await modal.locator('#defaultTareWeight').fill('1.8');
    await modal.locator('#stockQuantity').fill('100');

    // Nhấn Lưu
    await modal.locator('button:has-text("Tạo mới")').click();

    // Xác nhận thông báo thành công và hiển thị trong bảng
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(activeTab.locator('table').locator(`text=${packagingName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('4. Thêm mới Nhà cung cấp (/master-data/partners)', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-6);
    const partnerName = `Đội Tàu Test ${timestamp}`;
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    await page.goto('/master-data/partners');
    await expect(activeTab.locator('h1:has-text("Nhà Cung Cấp")')).toBeVisible({ timeout: 10000 });

    // Mở modal Thêm nhà cung cấp
    const addBtn = activeTab.locator('button:has-text("Thêm Nhà Cung Cấp")');
    await addBtn.click();

    const modal = page.locator('.ant-modal:visible');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Điền tên, người liên hệ, SĐT
    await modal.locator('#name').fill(partnerName);
    await modal.locator('#code').fill(`NCC_${timestamp}`);
    await modal.locator('#contactPerson').fill('Thuyền trưởng Nguyễn Văn Test');
    await modal.locator('#phone').fill('0912345678');

    // Nhấn Lưu
    await modal.locator('button:has-text("Lưu thông tin")').click();

    // Xác nhận lưu thành công và nhà cung cấp mới xuất hiện trong bảng
    await expect(activeTab.locator('table').locator(`text=${partnerName}`).first()).toBeVisible({ timeout: 20000 });
  });
});
