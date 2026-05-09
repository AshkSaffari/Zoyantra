/**
 * File name helper utilities for generating consistent filenames
 */

/**
 * Generate a filename with project name, username, type, and timestamp
 * @param {string} projectName - Name of the project
 * @param {string} type - File type (csv, json, pdf)
 * @param {string} username - Username of the person exporting
 * @returns {string} Generated filename
 */
export function generateFileName(projectName, type, username) {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "")
    .split(".")[0]; // e.g. 2025-09-21_1930
  
  // Clean project name and username for filename
  const cleanProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${cleanProjectName}_${cleanUsername}_TimesheetLog_${timestamp}.${type}`;
}

/**
 * Generate a simple filename with just timestamp
 * @param {string} type - File type (csv, json, pdf)
 * @returns {string} Generated filename
 */
export function generateSimpleFileName(type) {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "")
    .split(".")[0];
  
  return `TimesheetLog_${timestamp}.${type}`;
}

/**
 * Sanitize a string for use in filenames
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeFileName(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, '_');
}
