const { metadataResponse } = require('./apiResponse');
const config44 = require('./.config44');

let optionsHeader; // options.config44.optionsHeader
let optionsBody; // options.config44.optionsBody
let bulkOptions; // options.config44.bulkOptions.allowedMethods

const head = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Get total count of items in the collection
            // TODO: redis cache
            const totalCount = await Model.countDocuments();

            // TODO: redis cache
            const lastModifiedDoc = await Model.findOne()
                .sort({ updatedAt: -1 })
                .select('updatedAt')
                .lean();

            // Set custom metadata headers for client information
            res
                .status(200)
                .header({
                    'X-Total-Count': totalCount.toString(),
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                });
            // Expose custom headers for CORS compatibility
            // res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Last-Modified');

            // Add last modified header if documents exist
            if (lastModifiedDoc) {
                res
                    .status(200)
                    .header({
                        'X-Last-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString(),
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    });
            }

            // HEAD request returns headers only, no body content
            res.status(200).end();
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while checking items collection',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const option = function (Model, options = {}) {
    return async function (req, res) {
        try {
            optionsHeader = options.optionsHeader || config44.optionsHeader
            optionsBody = options.optionsBody || config44.optionsBody
            res
                .status(204)
                .header(optionsHeader)
                .json(optionsBody);
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while checking items collection',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

// getAll // advancedSearch
/**
 * Advanced search handler
 * Query params supported:
 *   ?search=keyword         -> text search on 'name'
 *   ?category=Electronics   -> exact match
 *   ?price[gte]=10&price[lte]=100 -> range filter
 *   ?rating[gt]=4.5
 *   ?inStock=true
 *   ?sort=-price,rating     -> sort by price desc, then rating asc
 *   ?fields=name,price,rating
 *   ?page=2&limit=10
 */
const getAll = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const cacheKey = `cache:${Model.modelName}:${JSON.stringify(req.query)}:${req.method}`;
            // console.log('cacheKey===');
            // console.log(cacheKey);
            const cacheRedis = options.cacheRedis || config44.cacheRedis || false;
            if (cacheRedis) {
                const cached = await cacheRedis.get(cacheKey);
                if (cached) res.json(JSON.parse(cached)); // TODO: best response
            }
            const collection = req.path.split('/').filter(Boolean).pop();
            options.collection = options.collection || collection;
            // if (req.query.isMaster !== undefined) {
            //     query = query.where('isMaster').equals(req.query.isMaster === 'true');
            // }

            // 1. Clone query params
            const reqQuery = { ...req.query };
            // console.log('reqQuery===');
            // console.log(reqQuery);

            // 2. Remove reserved fields
            const removeFields = [ // removeFields===excludedFields
                'page',
                'sort',
                'limit',
                'fields',
                'select',
                'search',
                'query',
                'q',
                'populate'
            ];
            removeFields.forEach(param => delete reqQuery[param]);

            // 3. Convert operators (gte, gt, lte, lt, in)
            // convert ?price[gte]=100 in { price: { $gte: 100 } }
            let queryStr = JSON.stringify(reqQuery);
            queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|nin|ne)\b/g, match => `$${match}`); // (match) => `$${match}`
            // console.log('queryStr===');
            // console.log(queryStr);

            let query = Model.find(JSON.parse(queryStr));

            // 4. Full-text / keyword search
            const search = req.query.search || req.query.q || req.query.query;
            // if (search && options.searchFields) {
            if (search && options.searchFields.length) {
                const searchRegex = new RegExp(search, 'i');
                query = query.find({
                    $or: options.searchFields.map(field => ({
                        [field]: searchRegex // === { $regex: search, $options: "i" }
                    }))
                });
            }
            // console.log('search===');
            // console.log(search);
            // console.log('query.find===');
            // console.log(query.find);

            // 5. Field selection
            const select = req.query.select || req.query.fields;
            if (select) {
                const fields = select.split(',').join(' ');
                query = query.select(fields);
                // console.log('select===');
                // console.log(fields);
            } else if (options.defaultSelect) {
                query = query.select(options.defaultSelect || '-__v');
                // console.log('select===');
                // console.log(options.defaultSelect);
            }
            // console.log('select===');
            // console.log(query.select);

            // 6. Sorting
            if (req.query.sort) {
                const sortBy = req.query.sort.split(',').join(' ');
                query = query.sort(sortBy);
                // console.log('sortBy===');
                // console.log(sortBy);
            } else {
                const sortBy = options.defaultSort || '-createdAt'
                query = query.sort(sortBy);
                // console.log('sortBy2===');
                // console.log(sortBy);
            }
            // console.log('sort===');
            // console.log(query.sort);

            // 7. Pagination
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit; // min(page × limit, totalItems)

            query = query.skip(skip).limit(limit);

            // 8. Population
            if (req.query.populate) {
                req.query.populate
                    .split(',')
                    .forEach(field => (query = query.populate(field)));
            } else if (options.populate) { // options.defaultPopulate
                query = query.populate(options.populate); // populateOptions = null,
            }
            // console.log('query.populate===');
            // console.log(query.populate);

            // 9. Execute query
            // TODO: add maxTimeMS
            // const result = await query
            // .maxTimeMS(4 * 60 * 1000) // 4 minutes
            // .lean();
            // const total = await Model.countDocuments(JSON.parse(queryStr));

            // Clone the query before adding pagination to get accurate count
            const countQuery = query.clone();

            // 10. Execute query with countDocuments for pagination metadata
            // Kill Queries by Role
            const MAX_TIME_QUERY_BY_ROLE = {
                user: 5_000, // TODO: option.maxTimeMS.user
                bot: 10_000, // TODO: option.maxTimeMS.bot
                admin: 15_000, // TODO: option.maxTimeMS.admin
            };
            const maxTimeMS = options.maxTimeMS || (MAX_TIME_QUERY_BY_ROLE[req.user.role] ?? 2_000);
            // console.log('maxTimeMS===');
            // console.log(maxTimeMS);
            const [result, total] = await Promise.all([
                // query.lean().exec(), // .lean({ virtuals: true })
                query.maxTimeMS(maxTimeMS).exec(),
                countQuery.countDocuments() // Count using the same query (including search filters)
            ]);
            // console.log('result===');
            // console.log(result);
            // console.log('total===');
            // console.log(total);

            // Calculate total pages for navigation
            const totalPages = Math.ceil(total / limit);

            // Build base URL for pagination links
            // Dynamically capture the API path from the request
            const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
            const queryString = req.originalUrl.includes('?')
                ? req.originalUrl.split('?')[1].replace(/&?(page|limit)=\d+/g, '')
                : '';
            const separator = queryString ? '&' : '';

            // Build HATEOAS links object for API navigation
            const links = {
                self: { href: `${baseUrl}?${queryString}${separator}page=${page}&limit=${limit}` },
                current: { href: `${baseUrl}?${queryString}` }
            };
            // First page link
            links.first = { href: `${baseUrl}?${queryString}${separator}page=1&limit=${limit}` };

            let linksHeaders = {
                self: links.self.href,
                current: links.current.href,
                first: links.first.href,
            }

            // Last page link (only if there are result)
            if (totalPages > 0) {
                links.last = { href: `${baseUrl}?${queryString}${separator}page=${totalPages}&limit=${limit}` };
                linksHeaders.last = links.last.href;
            }

            // Previous page link (only if not on first page)
            if (page > 1) {
                links.prev = { href: `${baseUrl}?${queryString}${separator}page=${page - 1}&limit=${limit}` };
                linksHeaders.prev = links.prev.href;
            }

            // Next page link (only if not on last page)
            if (page < totalPages) {
                links.next = { href: `${baseUrl}?${queryString}${separator}page=${page + 1}&limit=${limit}` };
                linksHeaders.next = links.next.href;
            }

            // Send response with standardized metadata and pagination links
            // Production-grade (RFC-friendly) version
            // Inspired by GitHub / JSON:API / RFC 8288
            // REST maturity level 3

            // Prepare response body
            const responseBody = {
                success: true,
                message: 'Items retrieved successfully',
                metadata: metadataResponse(200, req, options),
                pagination: {
                    totalItems: total, // total
                    itemsPerPage: limit, // limit: limit,
                    currentPage: page, // page
                    totalPages: totalPages, // pages
                    startIndex: startIndex,
                    endIndex: Math.min(endIndex, total),

                    hasNextPage: page < totalPages, // hasNextPage: page < Math.ceil(total / limit),
                    hasPreviousPage: page > 1,

                    nextPage: page < Math.ceil(total / limit) ? page + 1 : null, // nextPage: page + 1,
                    previousPage: page > 1 ? page - 1 : null
                },
                count: result.length,
                links: links,
                data: result
            };

            // Calculate content length
            const jsonString = JSON.stringify(responseBody);
            const contentLength = Buffer.byteLength(jsonString, 'utf8');

            // 🟡 Guardar en Redis
            // if (cacheRedis) {
            //     await cacheRedis.setEx(cacheKey, cacheTTL, JSON.stringify(response));
            // }

            res
                .status(200)
                .header({
                    'X-Total-Count': total, // TODO: totalCount.toString(),
                    'X-Total-Pages': totalPages,
                    'X-Current-Page': page,
                    'X-Per-Page': limit,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    'Status': '200 OK',
                    'Content-Length': contentLength.toString(),
                    'Content-Language': 'en'
                })
                .links(linksHeaders)
                .json(responseBody);
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to retrieve items',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const createOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // TODO: Add user to req.body for audit trail
            // req.body.createdBy = req.user.id || "444444";
            // console.log('req.body.createdBy===' + req.body.createdBy);

            // if (!req.user.role === "admin" && req.body.id) {
            //     req.body.id = undefined;
            // }

            // Create new item document
            const result = await Model.create(req.body);

            res
                .status(201)
                .header({
                    'Status': '201 Created',
                    'X-44-id': '++' + result.id || '++' + req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    message: 'Item created successfully',
                    metadata: metadataResponse(201, req),
                    data: result
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while creating item',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const headOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Check if item exists
            const result = await Model.findById(req.params.id)
                .select('updatedAt')
                .lean();

            // Return 404 if item not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'Status': '404 Not Found',
                        'X-Error': 'Item not found',
                        'X-44-id': '++' + req.params.id || 'N/A',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .end();
            }
            // Set appropriate headers with collection metadata
            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-44-id': '++' + result.id || '++' + req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                });

            // Add last modified header if document has updatedAt
            if (result.updatedAt) {
                res.header({
                    'X-Last-Modified': new Date(result.updatedAt).toUTCString()
                });
            }

            // HEAD request returns headers only, no body
            res.status(200).end();
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while checking item',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const optionOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            optionsHeader = options.optionsHeader || config44.optionsHeader
            // console.log('optionsHeader===');
            // console.log(optionsHeader);
            res
                .status(204)
                .header({
                    'Status': '204 No Content',
                    'X-44-id': '++' + req.params.id || 'N/A',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .header(optionsHeader)
                .end();
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while checking items collection',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const getOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const populate = req.query.populate ? req.query.populate.split(',').join(' ') : '';
            const fields = req.query.fields ? req.query.fields.replace(/,/g, ' ') : '';
            // console.log('fields===');
            // console.log(fields);

            // Find item by ID
            const result = await Model.findById(req.params.id);
            // const result = await Model.findById(req.params.id).populate(populate).select(fields);

            // Return 404 if item not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'Status': '404 Not Found',
                        'X-Error': 'Item not found',
                        'X-44-id': '++' + req.params.id || 'N/A',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Item not found',
                        metadata: metadataResponse(404, req)
                    });
            }

            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-44-id': '++' + result.id || '++' + req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    metadata: metadataResponse(200, req),
                    data: result
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while fetching item',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const updateOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // PATCH or PUT === create new document with new data
            // + update master

            // Find and update item with validation
            const result = await Model.findByIdAndUpdate(req.params.id, req.body, {
                new: false,
                runValidators: true
            });

            // Return 404 if item not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'Status': '404 Not Found',
                        'X-Error': 'Item not found',
                        'X-44-id': '++' + req.params.id || 'N/A',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Item not found',
                        metadata: metadataResponse(404, req)
                    });
            }

            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-44-id': '++' + result.id || '++' + req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                })
                .json({
                    success: true,
                    message: 'Item updated successfully',
                    metadata: metadataResponse(200, req),
                    data: result
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while updating item',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const replaceOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // PATCH or PUT === create new document with new data
            // + update master

            // Replace entire document (PUT semantics - full replacement)
            const result = await Model.findByIdAndUpdate(
                req.params.id,
                req.body,
                {
                    new: false,
                    runValidators: true,
                    overwrite: true  // Enable full document replacement
                }
            );

            // Return 404 if item not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'Status': '404 Not Found',
                        'X-Error': 'Item not found',
                        'X-44-id': '++' + req.params.id || 'N/A',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Item not found',
                        metadata: metadataResponse(404, req)
                    });
            }

            res
                .status(200)
                .header({
                    // 'x-user-role': req.user.role || 'guest'
                    'Status': '200 OK',
                    'X-44-id': '++' + result.id || '++' + req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                })
                .json({
                    success: true,
                    message: 'Item replaced successfully',
                    metadata: metadataResponse(200, req),
                    data: result
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while replacing item',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const deleteOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // /bulk?soft=false
            // /bulk?soft=true (default)

            // Find the item document
            const result = await Model.findById(req.params.id);

            // Return 404 if not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'Status': '404 Not Found',
                        'X-Error': 'Item not found',
                        'X-44-id': '++' + req.params.id || 'N/A',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Item not found',
                        metadata: metadataResponse(404, req)
                    });
            }

            // TODO: user role !== 'guest'
            // TODO: Add user isBlocked=flase
            if (!req.user || !req.user.id) {
                return res
                    .status(403)
                    .header({
                        'Status': '403 Forbidden',
                        'X-Error': 'Not authorized to delete this item. User authentication required.',
                        'X-44-id': '++' + result.id || '++' + req.params.id || 'N/A',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Not authorized to delete this item. User authentication required.',
                        metadata: metadataResponse(403, req)
                    });
            }

            // TODO: Add user to req.body for audit trail
            // req.body.updatedBy = req.user.id;
            // hard delete only if(user.role==="admin"){}
            if (req.query.softDelete === 'false' || req.query.hardDelete === true) {
                // HardDelete the document
                await Model.findByIdAndDelete(req.params.id);

                res
                    .status(204)
                    .header({
                        'Status': '204 No Content',
                        'X-44-id': '++' + result.id || '++' + req.params.id,
                        'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    })
                    .json({
                        success: true,
                        metadata: metadataResponse(204, req),
                        id: req.params.id,
                        data: null,
                    });
            } else {
                req.body.deletedBy = req.user.id;
                req.body.isDeleted = true;
                req.body.deletedAt = new Date();

                // SoftDelete the document
                await Model.findByIdAndUpdate(req.params.id, req.body, {
                    new: false,
                    runValidators: true
                });

                res
                    .status(204)
                    .header({
                        'Status': '204 No Content',
                        'X-44-id': '++' + result.id || '++' + req.params.id,
                        'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    })
                    .json({
                        success: true,
                        metadata: metadataResponse(204, req),
                        id: req.params.id,
                        data: null,
                    });
            }
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while deleting item',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const bulkHead = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Get total count of items in the collection
            const totalCount = await Model.countDocuments();

            // Get the last modified date of the collection
            const lastModifiedDoc = await Model.findOne()
                .sort({ updatedAt: -1 })
                .select('updatedAt')
                .lean();

            // Set custom metadata headers for client information
            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-Total-Count': totalCount.toString(),
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                });

            // Add last modified header if documents exist
            if (lastModifiedDoc) {
                res.header({
                    'X-Last-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString()
                });
            }
            // Expose custom headers for CORS compatibility
            res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Last-Modified');

            // HEAD request returns headers only, no body content
            res.status(200).end();
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Server error while checking bulk collection',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};
// exports.headBulkExistence = async (req, res) => {
//   try {
//     // Accept IDs as a comma-separated string in query: HEAD /items?ids=id1,id2,id3
//     const idsParam = req.query.ids;

//     if (!idsParam) {
//       return res.status(400).set('X-Error', 'Missing ids query parameter').end();
//     }

//     const requestedIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);

//     if (requestedIds.length === 0) {
//       return res.status(400).set('X-Error', 'Invalid ids format').end();
//     }

//     // Query ONLY the _id field to minimize memory and network overhead
//     const foundDocs = await Item.find({ _id: { $in: requestedIds } })
//       .select('_id')
//       .lean();

//     const foundIds = new Set(foundDocs.map(doc => doc._id.toString()));
//     const foundCount = foundIds.size;
//     const missingCount = requestedIds.length - foundCount;

//     // EDA: Log existence checks (useful for detecting scraping or invalid bulk requests)
//     eventEmitter.emit('items:bulkHeadChecked', {
//       requested: requestedIds.length,
//       found: foundCount,
//       missing: missingCount,
//       ip: req.ip
//     });

//     // Set descriptive headers
//     res.set('X-Items-Requested', requestedIds.length.toString());
//     res.set('X-Items-Found', foundCount.toString());
//     res.set('X-Items-Missing', missingCount.toString());
//     res.set('Access-Control-Expose-Headers', 'X-Items-Requested, X-Items-Found, X-Items-Missing');

//     // Return 200 OK (or 404 if 0 found, depending on your API design)
//     const statusCode = foundCount > 0 ? 200 : 404;
//     res.status(statusCode).end(); // NO BODY

//   } catch (error) {
//     res
// .status(500).header({
// 'Status': '500 Internal Server Error',
//     'X-Error': 'Internal Server Error'
//                 }).end();
//   }
// };

const bulkOption = function (Model, options = {}) {
    return async function (req, res) {
        try {
            bulkOptions = options.bulkOptions || config44.bulkOptions
            // Set CORS and allowed methods headers
            // res.setHeader('Allow', bulkOptions.allowedMethods.join(', '));
            // res.setHeader('Access-Control-Allow-Methods', bulkOptions.allowedMethods.join(', '));
            // res.setHeader('Access-Control-Allow-Headers', bulkOptions.allowedHeaders.join(', '));
            // res.setHeader('Access-Control-Expose-Headers', bulkOptions.exposedHeaders.join(', '));
            res
                .header({
                    // 'Allow': bulkOptions.allowedMethods.join(', '),
                    // 'Access-Control-Allow-Methods': bulkOptions.allowedMethods.join(', '),
                    // 'Access-Control-Allow-Headers': bulkOptions.allowedHeaders.join(', '),
                    // 'Access-Control-Expose-Headers': bulkOptions.exposedHeaders.join(', '),
                    'Status': '200 OK',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                });

            // Return detailed information about bulk operations
            res
                .status(200)
                .json({
                    success: true,
                    metadata: metadataResponse(200, req),
                    data: {
                        description: 'Bulk operations endpoint',
                        allowedMethods: bulkOptions.allowedMethods,
                        allowedHeaders: bulkOptions.allowedHeaders,
                        exposedHeaders: bulkOptions.exposedHeaders,
                        supportedOperations: bulkOptions.supportedOperations,
                        notes: bulkOptions.notes
                    }
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const bulkCreate = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const { items } = req.body;

            // Validate input
            if (!Array.isArray(items) || items.length === 0) {
                return res
                    .status(400)
                    .header({
                        'Status': '400 Bad Request',
                        'X-Error': 'Request body must contain a non-empty array of items',
                        'X-44-id': '++' + req.params.id || 'N/A',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Request body must contain a non-empty array of items'
                    });
            }

            // Insert multiple documents (ordered: stops on first error)
            const createdItems = await Model.insertMany(items, { ordered: true });

            res
                .status(201)
                .header({
                    'Status': '201 Created',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    message: `${createdItems.length} items created successfully`,
                    metadata: metadataResponse(201, req),
                    stats: {
                        totalRequested: items.length,
                        createdCount: createdItems.length
                    },
                    data: createdItems
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to create items in bulk',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const bulkUpdate = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const items = req.body;

            // Validate payload structure
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res
                    .status(400)
                    .header({
                        'Status': '400 Bad Request',
                        'X-Error': 'Request body must contain a non-empty array of items',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Request body must contain a non-empty array of items',
                        metadata: metadataResponse(400, req)
                    });
            }

            // Map payload to MongoDB bulkWrite operations
            const bulkOperations = items.map(item => {
                // Validate each item has an ID
                if (!item.id) {
                    throw new Error('Each update object must contain an "id" field.');
                }
                const { id, ...updateData } = item;
                return {
                    updateOne: {
                        filter: { _id: id },
                        update: { $set: updateData }, // $set ensures PATCH behavior (partial update)
                        runValidators: true,
                        new: false
                    }
                };
            });

            // Execute bulk write operation (ordered: stops on first error)
            const result = await Model.bulkWrite(bulkOperations, { ordered: true });

            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    message: `${result.nModified} items updated successfully`,
                    metadata: metadataResponse(200, req),
                    stats: {
                        totalRequested: items.length,
                        matchedCount: result.nMatched,
                        modifiedCount: result.nModified
                    },
                    data: result
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to update items in bulk',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const bulkReplace = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const items = req.body;

            // Validate payload structure
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res
                    .status(400)
                    .header({
                        'Status': '400 Bad Request',
                        'X-Error': 'Request body must contain a non-empty array of items replacements',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Request body must contain a non-empty array of items replacements',
                        metadata: metadataResponse(400, req)
                    });
            }

            // Map payload to replaceOne operations
            const bulkOperations = items.map(item => {
                // Validate each item has an ID
                if (!item.id) {
                    throw new Error('Each replacement object must contain an "id" field.');
                }
                const { id, ...replacementData } = item;
                return {
                    replaceOne: {
                        filter: { _id: id },
                        replacement: replacementData,
                        runValidators: true
                    }
                };
            });

            // Execute bulk write operation
            const result = await Model.bulkWrite(bulkOperations, { ordered: true });

            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    message: `${result.nModified} items replaced successfully`,
                    metadata: metadataResponse(200, req),
                    stats: {
                        totalRequested: items.length,
                        matchedCount: result.nMatched,
                        modifiedCount: result.nModified,
                        upsertedCount: result.nUpserted
                    },
                    data: result
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to replace items in bulk',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

const bulkDelete = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const { ids } = req.body;
            const softDelete = req.query.softDelete === 'true';
            const hardDelete = req.query.hardDelete === 'true';
            // /bulk?soft=false
            // /bulk?soft=true (default)

            // Validate payload
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res
                    .status(400)
                    .header({
                        'Status': '400 Bad Request',
                        'X-Error': 'Request body must contain a non-empty array of item IDs to delete',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Request body must contain a non-empty array of item IDs to delete',
                        metadata: metadataResponse(400, req)
                    });
            }

            // Optional: validate that all IDs are valid ObjectIds
            const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidIds.length > 0) {
                return res
                    .status(400)
                    .header({
                        'Status': '400 Bad Request',
                        'X-Error': 'Invalid ObjectId format',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: `Invalid ObjectId format: ${invalidIds.join(', ')}`,
                        metadata: metadataResponse(400, req)
                    });
            }

            let result;

            // TODO: Add user info for audit trail
            const deletedBy = req.user.id;

            if (softDelete) {
                // Soft delete: mark as deleted without removing from database
                result = await Model.updateMany(
                    { _id: { $in: ids } },
                    { $set: { deletedAt: new Date(), isDeleted: true, deletedBy: deletedBy } }
                );

                res
                    .status(200)
                    .header({
                        'Status': '200 OK',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: true,
                        message: `${result.modifiedCount} items soft-deleted successfully`,
                        metadata: metadataResponse(200, req),
                        stats: {
                            totalRequested: ids.length,
                            matchedCount: result.matchedCount,
                            modifiedCount: result.modifiedCount,
                            deletionType: 'soft'
                        }
                    });
            } else {
                // Hard delete: permanently remove documents from database
                if (!req.user.role === 'admin') {
                    return res
                        .status(403)
                        .header({
                            'Status': '403 Forbidden',
                            'X-Error': 'Not authorized to bulk delete items',
                            'X-44-id': '++' + req.params.id || 'N/A',
                            'X-Response-Time': `${Date.now() - req._startTime}ms`
                        })
                        .json({
                            success: false,
                            error: 'Not authorized to bulk delete items',
                            metadata: metadataResponse(403, req)
                        });
                }

                result = await Model.deleteMany({ _id: { $in: ids } });

                res
                    .status(200)
                    .header({
                        'Status': '200 OK',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: true,
                        message: `${result.deletedCount} items deleted successfully`,
                        metadata: metadataResponse(200, req),
                        stats: {
                            totalRequested: ids.length,
                            deletedCount: result.deletedCount,
                            deletionType: 'hard'
                        }
                    });
            }
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to delete items in bulk',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

/**
 * Not Implemented Controller
 * Returns 501 status code for endpoints that are planned but not yet implemented
 * Useful for API documentation and roadmap communication
 */
const notImplemented = function (Model, options = {}) {
    return async function (req, res) {
        const endpointName = options.endpointName || req.path;
        const plannedFeatures = options.plannedFeatures || [];
        const estimatedRelease = options.estimatedRelease || null;
        const documentation = options.documentation || null;

        res
            .status(501)
            .header({
                'Status': '501 Not Implemented',
                'X-Error': 'Not Implemented',
                'X-Response-Time': `${Date.now() - req._startTime}ms`
            })
            .json({
                success: false,
                error: 'Not Implemented',
                // message: error.message || 'Server error',
                message: `The endpoint '${endpointName}' is planned for future release but not yet implemented`,
                details: process.env.NODE_ENV === 'development' ? error : undefined,
                metadata: metadataResponse(501, req, options),
                details: {
                    endpoint: endpointName,
                    method: req.method,
                    status: 'planned',
                    plannedFeatures: plannedFeatures,
                    estimatedRelease: estimatedRelease,
                    documentation: documentation,
                    suggestion: 'Please check our API documentation or roadmap for updates on this feature'
                }
            });
    };
};

/**
 * POST /aggregate (Pipeline enviado en body)
 * Soporta $lookup, $match, $group, $facet, etc.
 */
const aggregate = function (Model, options = {}) {
    return async function (req, res) {
        try {
            res
                .status(501)
                .header({
                    'Status': '501 Not Implemented',
                    'X-Error': 'Not Implemented',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Not Implemented'
                });
            // const pipeline = req.body?.pipeline;
            // if (!Array.isArray(pipeline)) {
            //     return res.status(400).json({
            // success: false,
            // error: 'Invalid pipeline. Must be an array of stages.' });
            // }

            // // Validación básica de seguridad (opcional)
            // // pipeline.forEach(stage => { if (!Object.keys(stage)[0].startsWith('$')) throw new Error('Invalid stage'); });

            // const result = await Model.aggregate(pipeline);
            // res.json({
            // success: true, count: result.length,
            // data: result });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Aggregation failed',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
};

// lastModifiedDoc
const lastModifiedDoc = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const lastModifiedDoc = await Model.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean();
            res
                .status(200)
                .header({
                    'Status': '201 Created',
                    'X-44-id': '++' + lastModifiedDoc.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    'X-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString(),
                    'X-Last-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString()
                })
                .json({
                    success: true,
                    message: '',
                    metadata: metadataResponse(200, req),
                    data: lastModifiedDoc
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to retrieve last modified',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    metadata: metadataResponse(500, req)
                })
        }
    }
};

// /newest === /latest ~ /current
const newestDoc = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const newestDoc = await Model.findOne().sort({ createdAt: -1 }).select('createdAt').lean();
            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-44-id': '++' + newestDoc.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    'X-Newest': new Date(newestDoc.createdAt).toUTCString(),
                    'X-Newest-Date-Modified': new Date(newestDoc.createdAt).toUTCString(),
                    'X-Newest-Date-Created': new Date(newestDoc.createdAt).toUTCString(),
                    'X-Newest-Date': new Date(newestDoc.createdAt).toUTCString(),
                })
                .json({
                    success: true,
                    message: '',
                    metadata: metadataResponse(200, req),
                    data: newestDoc
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Internal server error',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    metadata: metadataResponse(500, req)
                })
        }
    }
}

// /oldest
const oldestDoc = function (Model, options = {}) {
    return async function (req, res) {
        try {
            const oldestDoc = await Model.findOne().sort({ createdAt: 1 }).select('createdAt').lean();
            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-44-id': '++' + oldestDoc.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    'X-Oldest': new Date(oldestDoc.createdAt).toUTCString(),
                    'X-Oldest-Date-Modified': new Date(oldestDoc.createdAt).toUTCString(),
                    'X-Oldest-Date-Created': new Date(oldestDoc.createdAt).toUTCString(),
                    'X-Oldest-Date': new Date(oldestDoc.createdAt).toUTCString(),
                    'X-Oldest-Date-Modified-UTC': new Date(oldestDoc.createdAt).toUTCString(),
                    'X-Oldest-Date-Created-UTC': new Date(oldestDoc.createdAt).toUTCString(),
                    'X-Oldest-Date-Modified-GMT': new Date(oldestDoc.createdAt).toGMTString(),
                    'X-Oldest-Date-Created-GMT': new Date(oldestDoc.createdAt).toGMTString(),
                    'X-Oldest-Date-Modified-Local': new Date(oldestDoc.createdAt).toLocaleString(),
                    'X-Oldest-Date-Created-Local': new Date(oldestDoc.createdAt).toLocaleString(),
                    'X-Oldest-Date-Modified-ISO': new Date(oldestDoc.createdAt).toISOString(),
                    'X-Oldest-Date-Created-ISO': new Date(oldestDoc.createdAt).toISOString(),
                })
                .json({
                    success: true,
                    message: '',
                    metadata: metadataResponse(200, req),
                    data: oldestDoc
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Internal server error',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    metadata: metadataResponse(500, req)
                })
        }
    }
}

// TODO: implement
// /random
const random = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Get count parameter from query (default to 1, max configurable)
            const count = parseInt(req.query.count, 10) || 1;
            const maxCount = options.maxRandomCount || 100;

            // Validate count
            if (count <= 0) {
                return res
                    .status(400)
                    .header({
                        'Status': '400 Bad Request',
                        'X-Error': 'Bad Request',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Invalid count parameter. Count must be a positive integer.',
                        message: error.message || 'Bad Request',
                        details: process.env.NODE_ENV === 'development' ? error : undefined,
                        metadata: metadataResponse(400, req)
                    });
            }

            if (count > maxCount) {
                return res
                    .status(400)
                    .header({
                        'Status': '400 Bad Request',
                        'X-Error': 'Bad Request',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: `Count exceeds maximum allowed (${maxCount}). Please reduce the count parameter.`,
                        message: error.message || 'Bad Request',
                        details: process.env.NODE_ENV === 'development' ? error : undefined,
                        metadata: metadataResponse(400, req)
                    });
            }

            // Build aggregation pipeline for random selection
            const pipeline = [];

            // Add match stage if filters are provided
            if (req.query.filters) {
                try {
                    const filters = JSON.parse(req.query.filters);
                    if (Object.keys(filters).length > 0) {
                        pipeline.push({ $match: filters });
                    }
                } catch (error) {
                    return res
                        .status(400)
                        .header({
                            'Status': '400 Bad Request',
                            'X-Error': 'Bad Request',
                            'X-Response-Time': `${Date.now() - req._startTime}ms`
                        })
                        .json({
                            success: false,
                            error: 'Invalid filters parameter. Must be valid JSON.',
                            message: error.message || 'Server error',
                            details: process.env.NODE_ENV === 'development' ? error : undefined,
                            metadata: metadataResponse(400, req)
                        });
                }
            }

            // Add sample stage for random selection
            pipeline.push({ $sample: { size: count } });

            // Add field selection if specified
            const fields = req.query.fields || req.query.select;
            if (fields) {
                const projection = {};
                fields.split(',').forEach(field => {
                    const trimmedField = field.trim();
                    if (trimmedField.startsWith('-')) {
                        projection[trimmedField.substring(1)] = 0;
                    } else {
                        projection[trimmedField] = 1;
                    }
                });
                pipeline.push({ $project: projection });
            } else if (options.defaultSelect) {
                const projection = {};
                options.defaultSelect.split(' ').forEach(field => {
                    if (field.startsWith('-')) {
                        projection[field.substring(1)] = 0;
                    } else {
                        projection[field] = 1;
                    }
                });
                pipeline.push({ $project: projection });
            }

            // Execute aggregation with timeout
            const MAX_TIME_QUERY_BY_ROLE = {
                user: 5_000,
                bot: 10_000,
                admin: 15_000,
            };
            const maxTimeMS = options.maxTimeMS || (MAX_TIME_QUERY_BY_ROLE[req.user?.role] ?? 2_000);

            const result = await Model.aggregate(pipeline)
                .allowDiskUse(true)
                .maxTimeMS(maxTimeMS);

            // Get total count for metadata (optional, can be expensive)
            let totalCount = null;
            if (options.includeTotalCount !== false) {
                const countPipeline = pipeline.filter(stage => !stage.$sample && !stage.$project);
                const countResult = await Model.aggregate([
                    ...countPipeline,
                    { $count: 'total' }
                ]);
                totalCount = countResult.length > 0 ? countResult[0].total : 0;
            }

            // Prepare response
            const responseBody = {
                success: true,
                message: `Successfully retrieved ${result.length} random item${result.length !== 1 ? 's' : ''}`,
                metadata: metadataResponse(200, req, options),
                count: result.length,
                requestedCount: count,
                data: result
            };

            // Add total count if available
            if (totalCount !== null) {
                responseBody.totalAvailable = totalCount;
            }

            // Calculate content length
            const jsonString = JSON.stringify(responseBody);
            const contentLength = Buffer.byteLength(jsonString, 'utf8');

            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    'X-Total-Count': totalCount !== null ? totalCount.toString() : 'N/A',
                    'X-Returned-Count': result.length.toString(),
                    'Content-Length': contentLength.toString()
                })
                .json(responseBody);

        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to retrieve random items',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                });
        }
    };
}

// TODO: implement
// /search
// /similar
// /discovery - methods for finding content, websites, communities, or people to follow on the web including search, directories, recommendation engines, tags,....
// /filters - advanced filtering/advanced search

// TODO: upgrade
// getStats
const stats = function (Model) {
    return async function (req, res) {
        try {
            const stats = await Model.aggregate([
                { $group: { _id: null, count: { $sum: 1 } } }
            ]);
            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    message: 'Successfully retrieved stats',
                    metadata: metadataResponse(200, req),
                    data: {
                        total: '',
                        stats: stats
                    }
                })
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to retrieve stats',
                    message: error.message || 'Server error',
                    details: process.env.NODE_ENV === 'development' ? error : undefined,
                    metadata: metadataResponse(500, req)
                })
        }
    }
}

/**
 * Find place near a location using GeoJSON
 * GET /api/v4/bakery/bakeries/nearby?lng=-73.935242&lat=40.730610&maxDistance=5000
 */
const getNearby = function (Model) {
    return async function (req, res) {
        try {
            const { lng, lat, maxDistance } = req.query;

            // Validate required parameters
            if (!lng || !lat) {
                return res
                    .status(400)
                    .header({
                        'Status': '400',
                        'X-Error': 'Bad Request',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Longitude (lng) and latitude (lat) are required query parameters',
                        message: error.message || 'Bad Request',
                        details: process.env.NODE_ENV === 'development' ? error : undefined,
                        metadata: metadataResponse(400, req)
                    });
            }

            const longitude = parseFloat(lng);
            const latitude = parseFloat(lat);
            const distanceInMeters = parseInt(maxDistance) || 5000; // Default 5km

            // Validate coordinates
            if (isNaN(longitude) || isNaN(latitude)) {
                return res
                    .status(400)
                    .header({
                        'Status': '400',
                        'X-Error': 'Bad Request',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Invalid coordinates. Longitude and latitude must be numbers',
                        message: error.message || 'Bad Request',
                        details: process.env.NODE_ENV === 'development' ? error : undefined,
                        metadata: metadataResponse(400, req)
                    });
            }

            if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
                return res
                    .status(400)
                    .header({
                        'Status': '400',
                        'X-Error': 'Bad Request',
                        'X-Response-Time': `${Date.now() - req._startTime}ms`
                    })
                    .json({
                        success: false,
                        error: 'Coordinates out of valid range',
                        message: error.message || 'Bad Request',
                        details: process.env.NODE_ENV === 'development' ? error : undefined,
                        metadata: metadataResponse(400, req)
                    });
            }

            // Build geospatial query using $near with GeoJSON
            const query = {
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
                        },
                        $maxDistance: distanceInMeters // Distance in meters
                    }
                }
            };

            // Execute query
            const items = await Model.find(query)
                .select('-__v')
                .sort({ createdAt: -1 });

            // Calculate distances for each item
            const itemsWithDistance = items.map(item => {
                const itemObj = item.toObject();

                // Calculate approximate distance using Haversine formula
                if (item.location && item.location.coordinates) {
                    const [itemLng, itemLat] = item.location.coordinates;
                    const distance = calculateDistance(latitude, longitude, itemLat, itemLng);
                    itemObj.distance = Math.round(distance); // Distance in meters
                    itemObj.distanceKm = Math.round(distance / 1000 * 100) / 100; // Distance in km
                }

                return itemObj;
            });

            res
                .status(200)
                .header({
                    'Status': '200 OK',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    message: `Found ${itemsWithDistance.length} items within ${distanceInMeters}m`,
                    metadata: metadataResponse(200, req),
                    searchCriteria: {
                        center: {
                            latitude: latitude,
                            longitude: longitude
                        },
                        maxDistance: distanceInMeters,
                        maxDistanceKm: distanceInMeters / 1000
                    },
                    data: itemsWithDistance
                });
        } catch (error) {
            res
                .status(500)
                .header({
                    'Status': '500 Internal Server Error',
                    'X-Error': 'Internal Server Error',
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: false,
                    error: 'Failed to search nearby place',
                    message: error.message || "Server error",
                    metadata: metadataResponse(500, req)
                });
        }
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

module.exports = {
    head,
    option,
    getAll,
    createOne,
    headOne,
    optionOne,
    getOne,
    updateOne,
    replaceOne,
    deleteOne,
    bulkHead,
    bulkOption,
    bulkCreate,
    bulkUpdate,
    bulkReplace,
    bulkDelete,
    // advancedSearch,
    random,
    notImplemented,
    aggregate,
    lastModifiedDoc,
    newestDoc,
    oldestDoc,
    getNearby,
    stats
};

///////////////////////

// options.searchFields
// 	{ name: searchRegex },
// 	{ description: searchRegex }
// options.defaultSelect
// options.defaultSort
// options.populate
// {
//     "searchFields": "";
//     "defaultSelect": "";
//     "defaultSort": "";
//     "populate": "";
// }

// options.config44.optionsHeader

// 'X-Last-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString()
// Last-Modified:
// Content-Length:

// -res-
// {
//   "code": 200,
//   "success": true,
//   "status": "success",
//   "requestId": "abc-123",
//   "apiVersion": "v4",
//   "endpoint": "https://api.example.com/users/1",
//   "method": "GET",
//   "timestamp": 1712345678901,
//   "isoTime": "2026-06-03T12:34:56.789Z",
//   "message": "User retrieved successfully",
//   "data": { "id": 1, "name": "Alice" }
// }

// -td-
// PATCH or PUT === create new document with new data
// + update master
// -td-
// hard delete only if(user.role==="admin"){}

// -td-apiFactory
// +
// Sorting order (asc/desc):
// - `&sort={fieldName}` = asc
// - `&sort=-{fieldName}` = desc
// - ~`&order=asc`~ - not implemented
// - ~`&order=desc`~ - not implemented
// +
// - `/discovery44/` - discovery apps, bots and webs - community algorithms
// +
// - `/popular` - (content ranking algorithms)
// - `/trending` - `/rising` - (content ranking algorithms)
// - `/hot` - (content ranking algorithms)
// - `/top` - content ranking algorithms - (all-time high scores)
// +
// - `/trending-today`
// - `/trending-this-week`
// - `/trending-this-month`
// - `/trending-this-year`
// +
// - `/most-{action44}`
// - `/most-reactions`
// - `/most-likes`
// - `/most-shares`
// +
// - `/top-{number}`
// - `/top-10`
// - `/top-100`
// - `/top-1000`
// +
