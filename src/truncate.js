/**
 * Truncate string to specified length
 * @param {string} str - Input string to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
const truncate = (str, length) => str.substring(0, length);

module.exports = { truncate };
