import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
dayjs.tz.setDefault(VIETNAM_TIMEZONE);

/**
 * Định dạng ngày giờ theo múi giờ Việt Nam (UTC+7)
 * Tự động parse UTC ISO (có Z hoặc T) và convert sang giờ VN
 */
export function formatDateTime(
  dateInput: string | number | Date | dayjs.Dayjs | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  if (!dateInput) return '—';

  try {
    const str = String(dateInput).trim();

    // Nếu là chuỗi ISO UTC (chứa Z hoặc T)
    if (str.endsWith('Z') || str.includes('T')) {
      return dayjs.utc(str).tz(VIETNAM_TIMEZONE).format(format);
    }

    // Nếu là chuỗi ngày giờ thô kiểu "YYYY-MM-DD HH:mm" từ server UTC
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) {
      return dayjs.utc(str, 'YYYY-MM-DD HH:mm').tz(VIETNAM_TIMEZONE).format(format);
    }

    // Fallback sang parse thông thường
    const parsed = dayjs(str);
    if (!parsed.isValid()) return str;
    return parsed.format(format);
  } catch {
    return String(dateInput);
  }
}

/**
 * Định dạng ngày (DD/MM/YYYY) theo múi giờ Việt Nam
 */
export function formatDate(
  dateInput: string | number | Date | dayjs.Dayjs | null | undefined,
  format: string = 'DD/MM/YYYY'
): string {
  return formatDateTime(dateInput, format);
}
