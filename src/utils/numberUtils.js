/**
 * Utility functions for safe numeric operations
 */

/**
 * Safely converts a value to a number, handling strings, objects, and undefined values
 * @param {any} value - The value to convert to a number
 * @param {number} defaultValue - Default value if conversion fails (default: 0)
 * @returns {number} - The converted number or defaultValue
 */
export const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  // If it's already a number, return it
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  // If it's an object, try to extract numeric values
  if (typeof value === 'object' && value !== null) {
    // Try common property names for amounts
    const amountFields = ['amount', 'revised', 'originalAmount', 'unitPrice', 'totalAmount'];
    for (const field of amountFields) {
      if (value[field] !== undefined) {
        const parsed = safeParseFloat(value[field], defaultValue);
        if (parsed !== defaultValue) {
          return parsed;
        }
      }
    }
    return defaultValue;
  }
  
  return defaultValue;
};

/**
 * Safely formats a number with .toFixed(), handling non-numeric values
 * @param {any} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {number} defaultValue - Default value if conversion fails (default: 0)
 * @returns {string} - The formatted number string
 */
export const safeToFixed = (value, decimals = 2, defaultValue = 0) => {
  const num = safeParseFloat(value, defaultValue);
  return num.toFixed(decimals);
};

/**
 * Safely formats a number for currency display
 * @param {any} value - The value to format
 * @param {string} currency - Currency symbol (default: '$')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - The formatted currency string
 */
export const safeFormatCurrency = (value, currency = '$', decimals = 2) => {
  const num = safeParseFloat(value, 0);
  return `${currency}${num.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}`;
};

/**
 * Safely formats a number for display with locale-specific formatting
 * @param {any} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - The formatted number string
 */
export const safeFormatNumber = (value, decimals = 2) => {
  const num = safeParseFloat(value, 0);
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

/**
 * Safely calculates percentage
 * @param {any} value - The value to convert to percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} - The formatted percentage string
 */
export const safeFormatPercentage = (value, decimals = 1) => {
  const num = safeParseFloat(value, 0);
  return `${num.toFixed(decimals)}%`;
};

/**
 * Safely extracts budget amount from various budget object structures
 * @param {object} budget - The budget object
 * @returns {number} - The extracted amount
 */
export const extractBudgetAmount = (budget) => {
  if (!budget || typeof budget !== 'object') {
    return 0;
  }
  
  // Try different possible amount fields in order of preference
  const amountFields = [
    'revised',
    'originalAmount', 
    'amount',
    'unitPrice',
    'totalAmount'
  ];
  
  for (const field of amountFields) {
    const value = budget[field];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = safeParseFloat(value);
      if (parsed > 0) {
        return parsed;
      }
    }
  }
  
  // Try attributes object
  if (budget.attributes) {
    for (const field of amountFields) {
      const value = budget.attributes[field];
      if (value !== undefined && value !== null && value !== '') {
        const parsed = safeParseFloat(value);
        if (parsed > 0) {
          return parsed;
        }
      }
    }
  }
  
  return 0;
};
