module.exports = {
    apiVersion: 'v4',
    port: process.env.PORT || 4444,
    cors: process.env.CORS || '*',
    env: process.env.NODE_ENV || 'development',
    optionsBody: {
        resource: "/resource/{id}",
        methods: {
            GET: {
                auth: false,
                responses: [200, 404]
            },
            PATCH: {
                auth: true,
                responses: [200, 400, 409]
            },
            PUT: {
                auth: true,
                responses: [200, 400, 409]
            },
            DELETE: {
                auth: true,
                responses: [204]
            }
        },
        rateLimit: {
            limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
            maxRequests: 100,
            windowMs: 15 * 60 * 1000, // 15 minutes
            // "window: "15m",
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
            per: ["ip", "user", "token", "role"],
            headers: {
                remaining: "X-RateLimit-Remaining",
                reset: "X-RateLimit-Reset"
            }
        },
        auth: {
            required: true,
            schemes: ["bearer", "oauth2", "apiKey"]
        },
        allow: "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
        description: "",
        pagination: true,
        deprecated: false,
        sunset: "2027-04-04",
        formats: ["application/json"],
        version: "v4"
    },
    optionsHeaders: {
        // 'Accept-Patch': 'application/json',
        // 'Accept-Post': 'application/json',
        // 'Access-Control-Allow-Credentials': 'true',
        // 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, If-Match, Accept-Language',
        // 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
        // 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        // 'Allow': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
        // 'Cache-Control': 'public, max-age=86400',
        // "Access-Control-Max-Age": "86400",
        // Link: '<https://44.org/api/openapi.json>; rel="service-desc"; type="application/json"',
        // "X-API-Version": "v4"
    },
    bulkOptions: {
        allowedMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
        exposedHeaders: ['Content-Range', 'X-Total-Count'],
        supportedOperations: {
            GET: 'Retrieve a list of items (supports pagination, filtering, sorting)',
            POST: 'Create multiple items at once (bulk insert)',
            PATCH: 'Partially update multiple items (bulk patch)',
            PUT: 'Replace multiple items entirely (bulk replace)',
            DELETE: 'Delete multiple items by IDs',
            OPTIONS: 'Describe available operations'
        },
        // notes: [
        //     'All write operations accept an array of items in the request body.';
        //     For PATCH, use {
        //         "updates: [...] } where each item has an "id" field and fields to update ($set semantics).';
        // 	For PUT, use {
        //         "replacements: [...] } where each item has an "id" field and all required fields for full replacement.';
        // 	For DELETE, use {
        //         "ids: [...] } containing the _id strings to delete.';
        // 	'Optional query parameter ?soft=true on DELETE for soft delete (if schema supports).';
        //         'Optional query parameter ?upsert=true on PUT to create missing documents.'
        // ]
    },


    // 	"optionsHeaders": {
    // 	'Accept-Patch': 'application/json',
    // 	'Accept-Post': 'application/json',
    // 	'Access-Control-Allow-Credentials': 'true',
    // 	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, If-Match, Accept-Language',
    // 	'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    // 	'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    // 	'Allow': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    // 	'Cache-Control': 'public, max-age=86400',
    // 	"Access-Control-Max-Age": "86400",
    // 	"Link": '<https://44.org/api/openapi.json>; rel="service-desc"; type="application/json"',
    // 	"X-API-Version": "v4",
    // },
    // "bulkOptions": {
    // 	"allowedMethods": ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    // 	"allowedHeaders": ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    // 	"exposedHeaders": ['Content-Range', 'X-Total-Count'],
    // 	"supportedOperations": {
    // 		"GET": 'Retrieve a list of items (supports pagination, filtering, sorting)',
    // 		"POST": 'Create multiple items at once (bulk insert)',
    // 		"PATCH": 'Partially update multiple items (bulk patch)',
    // 		"PUT": 'Replace multiple items entirely (bulk replace)',
    // 		"DELETE": 'Delete multiple items by IDs',
    // 		"OPTIONS": 'Describe available operations'
    // 	},
    // 	"notes": [
    // 		'All write operations accept an array of items in the request body.',
    // 		'For PATCH, use { "updates": [...] } where each item has an "id" field and fields to update ($set semantics).',
    // 		'For PUT, use { "replacements": [...] } where each item has an "id" field and all required fields for full replacement.',
    // 		'For DELETE, use { "ids": [...] } containing the _id strings to delete.',
    // 		'Optional query parameter ?soft=true on DELETE for soft delete (if schema supports).',
    // 		'Optional query parameter ?upsert=true on PUT to create missing documents.'
    // 	]
    // }
}