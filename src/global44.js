const config44 = require("./.config44")
const { metadataResponse } = require('./apiResponse');

// global middleware
const global44 = function (config = {}) {
    return async function (req, res, next) {
        try {
            // console.log("req.user?.role || 'guest',");
            // console.log(req.user?.role);

            // Record request start time for response time calculation
            req._startTime = req._startTime || Date.now();

            // Generate or retrieve request ID
            const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Set comprehensive HTTP headers
            res.header({
                // Basic timestamp and version information
                'x-timestamp': Date.now(),
                'X-API-Version': config.apiVersion || config44.apiVersion || 'v4', // process.env.API_VERSION
                'X-Powered-By': config.xPoweredBy || 'Express44',
                'x-user-role': req.user?.role || 'guest',

                // Content negotiation headers
                'Accept': config.accept || 'application/json',
                'Accept-Patch': config.acceptPatch || 'application/json',
                'Accept-Post': config.acceptPost || 'application/json',
                'Accept-Charset': config.acceptCharset || 'utf-8, iso-8859-1;q=0.5',
                'Accept-Datetime': new Date().toUTCString(),
                'Accept-Encoding': config.acceptEncoding || 'gzip, deflate, br, compress',
                'Accept-Language': config.acceptLanguage || 'en',
                'Accept-Ranges': config.acceptRanges || 'bytes',
                'Content-Type': config.contentType || 'application/json; charset=utf-8',

                // Request headers (echo from client or set defaults)
                'Host': req.headers.host || req.hostname || 'localhost',
                'Date': new Date().toUTCString(),

                // CORS headers
                // 'Access-Control-Allow-Origin': '*',
                // 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, HEAD, OPTIONS',
                // 'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Request-ID',
                // 'Access-Control-Allow-Credentials': 'true',
                // 'Access-Control-Max-Age': '86400', // 24 hours
                // 'Access-Control-Expose-Headers': 'X-API-Version, X-Total-Count, X-Page-Number, X-Page-Size, X-Last-Modified, ETag, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After',

                // Security headers - helmet
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', // 1 year HSTS
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Resource-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',

                // Caching headers
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'ETag': `W/"${Date.now()}"`, // Simple version hash
                'Last-Modified': new Date().toUTCString(),
                'Vary': 'Accept-Encoding, Accept-Language, Authorization',

                // API-specific headers
                'Allow': config.allow || 'GET, POST, PATCH, PUT, DELETE, HEAD, OPTIONS',
                // 'Retry-After': '3600',
                // 'RateLimit-Limit': config.rateLimit?.limit || config44.rateLimit?.limit || '1000',
                // 'RateLimit-Remaining': config.rateLimit?.remaining || config44.rateLimit?.remaining || '999',
                // 'RateLimit-Reset': Math.floor(Date.now() / 1000) + (config.rateLimit?.reset || config44.rateLimit?.reset || 3600),

                // Pagination headers (default values, can be overridden in specific routes)
                // 'X-Total-Count': '0',
                // 'X-Page-Number': '1',
                // 'X-Page-Size': config.pageSize || config44.defaultPageSize || '20',
                // 'X-Total-Pages': '0',

                // Request tracking headers
                'X-Request-ID': requestId,
                'X-Response-Time': `${Date.now() - req._startTime}ms`,

                // Server information
                'Server': config.server || 'WikiAgoraSocial/4.0',
                'X-Generator': config.xGenerator || 'WikiAgoraSocial'
            });

            // Attach requestId to request object for logging purposes
            req.requestId = requestId;

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Server error while checking items collection',
                message: error.message || 'Server error',
                metadata: metadataResponse(500, req)
            });
        }
    };
};

module.exports = {
    global44
};