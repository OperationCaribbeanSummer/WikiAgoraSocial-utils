/**
 * Convierte texto a slug seguro para URLs
 * @param {string} text
 * @returns {string}
 */
const toSlug = (text) =>
  text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

module.exports = { toSlug };