import { useState, useRef, useCallback } from 'react';

/**
 * Custom Hook chống Double-Submit (Chống gửi nhiều lần khi mạng chậm / click liên tục).
 * 
 * Đặc điểm:
 * 1. Khóa cứng tức thì (0ms) bằng `useRef` để triệt tiêu race-condition trước khi React kịp re-render.
 * 2. Cung cấp state `isSubmitting` reactive cho giao diện (gắn vào button loading / disabled).
 * 3. Tự động mở khóa an toàn trong khối `finally` kể cả khi API thành công hoặc ném lỗi.
 */
export function useAsyncSubmit<T extends (...args: any[]) => Promise<any>>(asyncFn: T) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      if (isSubmittingRef.current) {
        return undefined;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        return await asyncFn(...args);
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [asyncFn]
  );

  return { isSubmitting, handleSubmit, isSubmittingRef };
}
