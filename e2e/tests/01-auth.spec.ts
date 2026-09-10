import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Xác thực & Đăng nhập (Authentication)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h3:has-text("Hệ thống Quản lý Kho Hải Sản")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Báo lỗi khi nhập sai mật khẩu', async ({ page }) => {
    await page.fill('input[placeholder="Email đăng nhập"]', 'admin@gmail.com');
    await page.fill('input[placeholder="Mật khẩu"]', 'SaiMatKhau@123');
    await page.click('button:has-text("Đăng nhập")');

    // Xác nhận hiển thị thông báo lỗi từ Ant Design
    const errorMessage = page.locator('.ant-message-error').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Đảm bảo vẫn ở trang login
    await expect(page).toHaveURL(/.*login/);
  });

  test('2. Đăng nhập thành công và đăng xuất an toàn', async ({ page }) => {
    // Điền tài khoản quản trị chính xác
    await page.fill('input[placeholder="Email đăng nhập"]', 'admin@gmail.com');
    await page.fill('input[placeholder="Mật khẩu"]', 'qazwsxedc@123A');
    await page.click('button:has-text("Đăng nhập")');

    // Chờ hệ thống xác thực và chuyển hướng ra khỏi trang login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Xác nhận Header hiển thị avatar người dùng
    const profileBtn = page.locator('button[aria-label="Mở menu tài khoản"]');
    await expect(profileBtn).toBeVisible({ timeout: 10000 });

    // Nhấn vào avatar để mở dropdown tài khoản
    await profileBtn.click();

    // Nhấn nút Đăng xuất trong menu
    const logoutBtn = page.locator('button:has-text("Đăng xuất")').first();
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Nhấn nút 'Đồng ý' trên Popconfirm xác nhận đăng xuất
    const confirmBtn = page.locator('.ant-popconfirm button:has-text("Đồng ý"), .ant-popover button:has-text("Đồng ý")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Xác nhận chuyển hướng trở lại trang login
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.locator('input[placeholder="Email đăng nhập"]')).toBeVisible();
  });
});
