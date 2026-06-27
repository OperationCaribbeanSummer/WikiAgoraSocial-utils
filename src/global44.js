// global middleware
// global44()
// X-44-id

export const global44 = (config) => async (req, res, next) => {
    res.header({
        'x-timestamp': Date.now(),
        'X-API-Version': config.apiVersion || 'v4',
        'X-Powered-By': 'Express44',
        // Accept-Patch: application/json
        // Accept-Post: application/json
        // Accept-Encoding: gzip, deflate, br, compress
        // Accept-Language: en
        // Allow: GET, POST, PATCH, DELETE, HEAD, OPTION
    })
    next()
}