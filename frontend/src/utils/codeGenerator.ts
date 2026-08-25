/**
 * Tự động sinh mã không dấu, viết hoa từ tên tiếng Việt
 * Ví dụ: "Cá Hồi Na Uy" -> "CA-HOI-NA-UY" (hoặc với prefix: "SP-CA-HOI-NA-UY")
 */
export function generateCodeFromName(name: string, prefix = ''): string {
  if (!name || typeof name !== 'string') return '';

  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toUpperCase();

  const base = prefix ? `${prefix}-${clean}` : clean;
  // Giới hạn độ dài 30 ký tự
  return base.slice(0, 30);
}
