/**
 * Financial utility functions for ExpenseSplitter
 * Backend stores amounts as integer paise (BIGINT).
 * 100 paise = 1 INR
 */

/**
 * Convert paise (integer or string) to formatted INR string (e.g., "₹500.00")
 * @param {number|string} paise 
 * @returns {string}
 */
export const formatRupees = (paise) => {
  if (paise === null || paise === undefined || isNaN(Number(paise))) {
    return '₹0.00';
  }
  const numericPaise = typeof paise === 'string' ? parseInt(paise, 10) : paise;
  const rupees = numericPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
};

/**
 * Convert rupees string/number input to integer paise safely
 * @param {number|string} rupees 
 * @returns {number}
 */
export const rupeesToPaise = (rupees) => {
  if (!rupees || isNaN(Number(rupees))) {
    return 0;
  }
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  return Math.round(num * 100);
};
