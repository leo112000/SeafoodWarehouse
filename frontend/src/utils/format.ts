import { formatDateTime } from './dateUtils';

export { formatDateTime };

/**
 * Format number as currency (VND)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

/**
 * Format weight in kilograms
 */
export const formatWeight = (value: number): string => {
  return `${value.toLocaleString('vi-VN')} kg`;
};

/**
 * Format date string to readable format according to Vietnam Timezone (UTC+7)
 */
export const formatDate = (dateInput: string | number | Date | null | undefined): string => {
  return formatDateTime(dateInput, 'YYYY-MM-DD HH:mm:ss');
};

