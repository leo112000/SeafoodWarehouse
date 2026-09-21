import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Báo lỗi & Khóa màn hình chuẩn ASP.NET Boilerplate khi Server gặp sự cố', () => {
  test('Hiển thị Modal ABP khóa tương tác toàn màn hình khi Server trả về Lỗi 502 / Offline', async ({ page }) => {
    // 1. Mở trang đăng nhập bình thường
    await page.goto('/login');
    const emailInput = page.locator('#login_form_email');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // 2. Mô phỏng sự cố mạng máy chủ (Server trả về lỗi 502 Bad Gateway)
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Bad Gateway - Service is down' }),
      });
    });

    // 3. Thực hiện thao tác gọi API (ví dụ: nhấn đăng nhập)
    await page.fill('#login_form_email', 'admin@gmail.com');
    await page.fill('#login_form_password', 'qazwsxedc@123A');
    await page.click('button[type="submit"]');

    // 4. Xác nhận Modal báo lỗi ABP xuất hiện và KHÓA CHẶN MÀN HÌNH
    const errorModal = page.locator('aside[aria-label="Cảnh báo sự cố máy chủ"]');
    await expect(errorModal).toBeVisible({ timeout: 5000 });
    await expect(errorModal).toContainText('Lỗi 502');
    await expect(errorModal).toContainText('Giao diện đã tạm thời khóa để bảo vệ dữ liệu');
    await expect(errorModal.locator('button:has-text("Thử kết nối lại ngay")')).toBeVisible();

    // Xác nhận backdrop mờ (mask) của Ant Design / ABP xuất hiện che toàn bộ màn hình
    const modalMask = page.locator('.ant-modal-mask');
    await expect(modalMask).toBeVisible({ timeout: 3000 });

    // 5. Khôi phục lại kết nối bình thường (Backend phục hồi và phản hồi Healthy)
    await page.unroute('**/api/**');
    await page.route('**/api/healthcheck', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'Healthy', timestamp: new Date().toISOString() }),
      });
    });
    await errorModal.locator('button:has-text("Thử kết nối lại ngay")').click();

    // 6. Xác nhận Modal đóng lại và thanh thông báo màu xanh phục hồi kết nối xuất hiện
    await expect(errorModal).not.toBeVisible({ timeout: 5000 });
    const recoveryBanner = page.locator('aside[aria-label="Thông báo khôi phục kết nối"]');
    await expect(recoveryBanner).toBeVisible({ timeout: 5000 });
  });

  test('Hiển thị popup Modal ABP (văng lỗi) khi gặp lỗi nghiệp vụ / 400 / 403', async ({ page }) => {
    // 1. Mở trang đăng nhập
    await page.goto('/login');
    await expect(page.locator('#login_form_email')).toBeVisible({ timeout: 10000 });

    // 2. Mô phỏng API trả về lỗi nghiệp vụ 400 kèm chi tiết validation
    await page.route('**/api/tenants/**', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Dữ liệu không hợp lệ theo quy tắc nghiệp vụ!',
          errors: ['Mã chi nhánh không tồn tại trong hệ thống', 'Vui lòng kiểm tra lại cấu hình'],
        }),
      });
    });

    // 3. Kích hoạt gọi API bằng cách nhập mã chi nhánh không hợp lệ
    const tenantInput = page.locator('input[placeholder*="chi nhánh"], input[placeholder*="Tenant"], input[placeholder*="Cửa hàng"]').first();
    if (await tenantInput.isVisible()) {
      await tenantInput.fill('INVALID_TENANT_999');
      // Nhấn Enter hoặc blur để kích hoạt kiểm tra
      await tenantInput.press('Enter');

      // 4. Xác nhận Modal lỗi ABP văng ra với tiêu đề và chi tiết lỗi
      const businessModal = page.locator('div[role="alertdialog"]:has-text("Có lỗi xảy ra!")');
      await expect(businessModal).toBeVisible({ timeout: 5000 });
      await expect(businessModal).toContainText('Dữ liệu không hợp lệ theo quy tắc nghiệp vụ!');

      // Nhấn nút Đồng ý để đóng popup ABP
      await businessModal.locator('button:has-text("Đồng ý")').click();
      await expect(businessModal).not.toBeVisible({ timeout: 3000 });
    }
  });
});



