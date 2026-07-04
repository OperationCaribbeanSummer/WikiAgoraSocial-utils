/**
 * Generate standardized API response metadata
 * @param {number} statusCode - HTTP status code
 * @param {string} collection - Optional collection name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} options - Optional configuration overrides
 * @param {string} options.apiVersion - API version (default: 'v4')
 * @returns {Object} Metadata object with response information
 */
// const metadataResponse = (statusCode, collection, req, res, options = {}) => {
const metadataResponse = (statusCode, req, options = {}) => {
    let apiVersion;
    if (options.config44) {
        apiVersion = options.config44.apiVersion || "v4"
    } else if (process.env.API_VERSION) {
        apiVersion = process.env.API_VERSION;
    } else {
        apiVersion = 'v4';
    }

    const metadata = {
        code: statusCode,
        success: statusCode < 400,
        status: statusCode < 400 ? 'success' : 'error',
        apiVersion: apiVersion,
        collection: options ? options.collection : null,
        endpoint: req ? `${req.protocol}://${req.get('host')}${req.originalUrl}` : null,
        timestamp: Date.now(),
        isoTime: new Date().toISOString(),
        requestId: req ? req.id : '',
        request: {
            id: req ? (req.id || '') : '',
            fullUrl: req ? `${req.protocol}://${req.get('host')}${req.originalUrl}` : '',
            method: req ? req.method : null,
            path: req ? req.path : null,
            url: req ? req.url : null,
            ip: req ? (req.ip || req.connection.remoteAddress) : null,
            query: req ? req.query : {},
            params: req ? req.params : {},
        }
    };

    return metadata;
};

module.exports = { metadataResponse };
