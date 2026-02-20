// Settlement utility functions for the settlement system
// Tax: Korean freelancer rate — 소득세 3% + 지방소득세 0.3% = 3.3%

export const TAX_RATE = 0.033;
export const INCOME_TAX_RATE = 0.03;
export const LOCAL_TAX_RATE = 0.003;

/**
 * Calculate Korean freelancer tax breakdown
 * @param preTaxAmount - Gross amount before tax (세전 금액)
 * @param taxRate - Override tax rate (default: 3.3%)
 */
export function calculateTax(
  preTaxAmount: number,
  taxRate: number = TAX_RATE,
): {
  incomeTax: number;
  localTax: number;
  totalTax: number;
  netAmount: number;
} {
  const incomeTax = Math.round(preTaxAmount * INCOME_TAX_RATE);
  const localTax = Math.round(preTaxAmount * LOCAL_TAX_RATE);
  const totalTax = incomeTax + localTax;
  const netAmount = preTaxAmount - totalTax;

  return { incomeTax, localTax, totalTax, netAmount };
}

/**
 * Format number as Korean Won currency string
 * @example formatKRW(912229) → "912,229원"
 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(amount)) + "원";
}

/**
 * Format number as Korean Won with ₩ prefix (for UI display)
 * @example formatKRWWithSymbol(912229) → "₩912,229"
 */
export function formatKRWWithSymbol(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Generate PDF filename in the format: YYYY-MM_이름(externalId)_지급내역서.pdf
 * @example generatePdfFilename(2025, 12, "김예솔", "92_3749") → "2025-12_김예솔(92_3749)_지급내역서.pdf"
 * @example generatePdfFilename(2025, 12, "홍길동") → "2025-12_홍길동_지급내역서.pdf"
 */
export function generatePdfFilename(
  year: number,
  month: number,
  name: string,
  externalId?: string | null,
): string {
  const monthStr = String(month).padStart(2, "0");
  const idPart = externalId ? `(${externalId})` : "";
  return `${year}-${monthStr}_${name}${idPart}_지급내역서.pdf`;
}

/**
 * Mask Korean resident registration number (주민등록번호)
 * Shows first 6 digits + hyphen + first digit of second part + 6 asterisks
 * @example maskIdNumber("9212102345678") → "921210-2******"
 * @example maskIdNumber("921210-2345678") → "921210-2******"
 */
export function maskIdNumber(idNumber: string): string {
  if (!idNumber) return "";
  // Remove existing hyphen if present
  const cleaned = idNumber.replace("-", "");
  if (cleaned.length < 7) return idNumber; // Too short to mask properly
  const front = cleaned.slice(0, 6);
  const genderDigit = cleaned[6] ?? "*";
  return `${front}-${genderDigit}******`;
}

/**
 * Get the date range for a given year/month
 * Returns start (inclusive) and end (exclusive) for that month
 * @example getMonthRange(2025, 12) → { startDate: 2025-12-01, endDate: 2026-01-01 }
 */
export function getMonthRange(year: number, month: number): {
  startDate: Date;
  endDate: Date;
} {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  return { startDate, endDate };
}

/**
 * Format year/month as Korean string
 * @example formatYearMonth(2025, 12) → "2025년 12월"
 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}년 ${String(month).padStart(2, "0")}월`;
}

/**
 * Get current year and month
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
