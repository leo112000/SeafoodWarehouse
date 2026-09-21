import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Xác thực & Đăng nhập (Authentication)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1:has-text("Đăng Nhập")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Báo lỗi khi nhập sai mật khẩu', async ({ page }) => {
    await page.fill('#login_form_email', 'admin@gmail.com');
    await page.fill('#login_form_password', 'SaiMatKhau@123');
    await page.click('button[type="submit"]');

    // Xác nhận hiển thị thông báo lỗi từ Form hoặc Ant Design Message
    const errorMessage = page.locator('.ant-form-item-explain-error, .ant-message-error').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Đảm bảo vẫn ở trang login
    await expect(page).toHaveURL(/.*login/);
  });

  test('2. Đăng nhập thành công và đăng xuất an toàn', async ({ page }) => {
    // Điền tài khoản quản trị chính xác
    await page.fill('#login_form_email', 'admin@gmail.com');
    await page.fill('#login_form_password', 'qazwsxedc@123A');
    await page.click('button[type="submit"]');

    // Chờ hệ thống xác thực và chuyển hướng ra khỏi trang login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Xác nhận Header hiển thị avatar người dùng
    const profileBtn = page.locator('button[aria-label="Mở menu tài khoản"]');
    await expect(profileBtn).toBeVisible({ timeout: 10000 });

    // Nhấn vào avatar để mở dropdown tài khoản
    await profileBtn.click();

    // Nhấn nút Đăng xuất trong menu
    const logoutBtn = page.locator('.ant-popover button:has-text("Đăng xuất"), button:has-text("Đăng xuất")').first();
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Nhấn nút 'Đăng xuất' trên Modal xác nhận
    const confirmBtn = page.locator('.ant-modal-confirm button:has-text("Đăng xuất"), .ant-modal button.ant-btn-dangerous, .ant-popconfirm button:has-text("Đồng ý")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Xác nhận chuyển hướng trở lại trang login
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.locator('#login_form_email')).toBeVisible();
  });
});
