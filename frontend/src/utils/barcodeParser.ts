export interface ParsedBarcodeData {
  raw: string;
  codeToMatch: string;
  weight?: number;
  lot?: string;
  exp?: string;
}

export interface ProductLike {
  id: string | number;
  code: string;
  name: string;
  status?: string;
}

/**
 * Phân tích chuỗi quét được từ mã QR hoặc Barcode (kể cả tem JSON in nhiệt)
 */
export function parseBarcodeText(scannedText: string): ParsedBarcodeData {
  const trimmed = (scannedText || '').trim();
  let codeToMatch = trimmed;
  let weight: number | undefined;
  let lot: string | undefined;
  let exp: string | undefined;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      codeToMatch = parsed.pCode || parsed.code || parsed.lot || codeToMatch;
      weight = parsed.weight ? Number(parsed.weight) : undefined;
      lot = parsed.lot;
      exp = parsed.exp;
    } catch {
      // Giữ nguyên trimmed nếu lỗi parse JSON
    }
  }

  return {
    raw: trimmed,
    codeToMatch,
    weight,
    lot,
    exp,
  };
}

/**
 * Tìm kiếm sản phẩm phù hợp từ mã barcode hoặc tên
 */
export function findMatchingProduct<T extends ProductLike>(
  codeOrText: string,
  products: T[]
): T | undefined {
  if (!codeOrText) return undefined;
  const inputTrimmed = codeOrText.trim().toLowerCase();

  // 1. Tìm chính xác tuyệt đối theo Mã sản phẩm hoặc ID
  let matched = products.find(
    (p) => p.code.toLowerCase() === inputTrimmed || String(p.id).toLowerCase() === inputTrimmed
  );
  if (matched) return matched;

  // 2. Tìm theo chuỗi chuẩn hóa không dấu phân cách
  const cleanInput = inputTrimmed.replace(/[^a-z0-9]/g, '');
  if (cleanInput) {
    matched = products.find((p) => {
      const pCodeClean = p.code.toLowerCase().replace(/[^a-z0-9]/g, '');
      return pCodeClean === cleanInput;
    });
  }
  if (matched) return matched;

  // 3. Tìm tương đối theo tên hải sản
  return products.find((p) => p.name.toLowerCase().includes(inputTrimmed));
}
