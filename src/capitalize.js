/**
 * Capitaliza primera letra
 * @param {string} str
 */
const capitalize = (str) => str?.charAt(0).toUpperCase() + str?.slice(1);

module.exports = { capitalize };
