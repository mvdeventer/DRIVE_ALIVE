/**
 * Format South African phone numbers
 * Converts:
 * - 06111545498 → +276111545498
 * - 0611154598 → +27611154598
 * - 11612345678 → +27611234567 (remove leading 1 if 11 digits and starts with 1)
 * - +27611154598 → +27611154598 (no change)
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove all spaces and special characters except + and digits
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with 0, replace with +27
  if (cleaned.startsWith('0')) {
    cleaned = '+27' + cleaned.substring(1);
  }
  // If it starts with 27 (without +), add +
  else if (cleaned.startsWith('27') && !cleaned.startsWith('+27')) {
    cleaned = '+' + cleaned;
  }
  // If it's 11 digits starting with 1, assume it's 0-prefixed and convert
  else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = '+27' + cleaned.substring(1);
  }
  // If it doesn't start with +27 or 0, assume it's a local number
  else if (!cleaned.startsWith('+27') && !cleaned.startsWith('27')) {
    if (cleaned.length === 10) {
      cleaned = '+27' + cleaned;
    } else if (cleaned.length === 9) {
      cleaned = '+27' + cleaned;
    }
  }

  return cleaned;
};

/**
 * Check if phone is in valid format
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone);
  // Valid SA phone: +27 followed by 9 digits (for cellphone) or 10 digits
  return /^\+27\d{9,10}$/.test(formatted);
};
