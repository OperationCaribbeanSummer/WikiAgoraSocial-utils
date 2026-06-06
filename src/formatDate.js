/**
 * Format date to locale string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => date.toLocaleDateString();

module.exports = { formatDate };
