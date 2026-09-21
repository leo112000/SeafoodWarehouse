import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Quản lý Thu hồi vỏ sọt (Packaging Loan & Return)', () => {
  const timestamp = Date.now().toString().slice(-6);
  const partnerName = `Khách Mượn Sọt ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // 1. Đăng nhập hệ thống
    await page.goto('/login');
    await expect(page.locator('#login_form_email')).toBeVisible({ timeout: 10000 });
    await page.fill('#login_form_email', 'admin@gmail.com');
    await page.fill('#login_form_password', 'qazwsxedc@123A');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  });

  test('Tạo phiếu cho mượn vỏ sọt và ghi nhận thu hồi hoàn trả', async ({ page }) => {
    const activeTab = page.locator('.keep-alive-tab-pane:visible');

    // 1. Điều hướng sang trang Quản lý Vỏ sọt
    await page.goto('/inventory/packaging-return');
    await expect(activeTab.locator('h1:has-text("Quản Lý Vỏ Sọt")')).toBeVisible({ timeout: 10000 });

    // 2. Nhấn nút "Tạo phiếu mượn"
    const openLoanBtn = activeTab.locator('button:has-text("Tạo phiếu mượn")');
    await openLoanBtn.click();

    const loanModal = page.locator('.ant-modal:has-text("Tạo Phiếu Cho Mượn")');
    await expect(loanModal).toBeVisible({ timeout: 5000 });

    // 3. Điền thông tin đối tác & loại sọt
    await loanModal.locator('#partnerName').fill(partnerName);

    const pkgSelect = loanModal.locator('.ant-select:has(#packagingCode)');
    await pkgSelect.click();
    const pkgOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
    await pkgOption.click();
    await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);

    // Điền số lượng giao mượn (10 cái)
    await loanModal.locator('#loanedQty').fill('10');

    // Nhấn Lưu phiếu cho mượn
    await loanModal.locator('button:has-text("Tạo phiếu cho mượn")').click();

    // Xác nhận thông báo thành công và hiển thị đối tác trong bảng công nợ
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
    await expect(activeTab.locator('table').locator(`text=${partnerName}`).first()).toBeVisible({ timeout: 10000 });

    // 4. Ghi nhận trả vỏ sọt
    const openReturnBtn = activeTab.locator('button:has-text("Ghi nhận Trả Vỏ")');
    await openReturnBtn.click();

    const returnModal = page.locator('.ant-modal:has-text("Ghi Nhận Trả Vỏ")');
    await expect(returnModal).toBeVisible({ timeout: 5000 });

    // Nhập số lượng trả lại kho (5 cái)
    await returnModal.locator('#returnedQty').fill('5');

    // Nhấn xác nhận trả
    await returnModal.locator('button:has-text("Xác nhận trả")').click();

    // Xác nhận thông báo ghi nhận thành công
    await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 10000 });
  });
});
