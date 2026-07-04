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
            // res.set({
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
                // res.set('X-Last-Modified', new Date(lastModifiedDoc.updatedAt).toUTCString());
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
            res.status(500).json({
                success: false,
                error: 'Server error while checking items collection',
                message: error.message || 'Server error',
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
            res.status(500).json({
                success: false,
                error: 'Server error while checking items collection',
                message: error.message || 'Server error',
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
            const removeFields = [
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
            let queryStr = JSON.stringify(reqQuery);
            queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|ne)\b/g, match => `$${match}`);
            // console.log('queryStr===');
            // console.log(queryStr);

            let query = Model.find(JSON.parse(queryStr));

            // 4. Full-text / keyword search
            const search = req.query.search || req.query.q || req.query.query;
            if (search && options.searchFields) {
                const searchRegex = new RegExp(search, 'i');
                query = query.find({
                    $or: options.searchFields.map(field => ({
                        [field]: searchRegex
                    }))
                });
            }
            console.log('search===');
            console.log(search);
            // console.log('query.find===');
            // console.log(query.find);

            // 5. Field selection
            const select = req.query.select || req.query.fields;
            if (select) {
                const fields = select.split(',').join(' ');
                query = query.select(fields);
            } else if (options.defaultSelect) {
                query = query.select(options.defaultSelect || '-__v');
            }
            console.log('select===');
            console.log(select);

            // 6. Sorting
            if (req.query.sort) {
                const sortBy = req.query.sort.split(',').join(' ');
                query = query.sort(sortBy);
                console.log('sortBy===');
                console.log(sortBy);
            } else {
                const sortBy = options.defaultSort || '-createdAt'
                query = query.sort(sortBy);
                console.log('sortBy2===');
                console.log(sortBy);
            }

            // 7. Pagination
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit; // min(page × limit, totalItems)

            // TODO: promiseAll()
            const total = await Model.countDocuments(JSON.parse(queryStr));
            console.log('total===');
            console.log(total);

            query = query.skip(skip).limit(limit);

            // 8. Population
            if (req.query.populate) {
                req.query.populate
                    .split(',')
                    .forEach(field => (query = query.populate(field)));
            } else if (options.populate) {
                query = query.populate(options.populate);
            }
            // console.log('query.populate===');
            // console.log(query.populate);

            // 9. Execute query
            // TODO: add maxTimeMS
            const result = await query
            // .maxTimeMS(4 * 60 * 1000) // 4 minutes
            // .lean();
            console.log('result===');
            console.log(result);

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

            res
                .status(200)
                .header({
                    'X-Total-Count': total, // TODO: totalCount.toString(),
                    'X-Total-Pages': totalPages,
                    'X-Current-Page': page,
                    'X-Per-Page': limit,
                    'X-44-id': result.id || req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                    'Status': '200 OK',
                    'Content-Length': contentLength.toString(),
                    'Content-Language': 'en',
                })
                .links(linksHeaders)
                .json(responseBody);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve items',
                error: error.message,
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

            // Create new bakery document
            const result = await Model.create(req.body);

            res
                .status(201)
                .header({
                    'X-44-id': result.id || req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    message: 'Item created successfully',
                    metadata: metadataResponse(201, req),
                    data: result
                });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Server error while creating item',
                message: error.message || 'Server error',
                metadata: metadataResponse(500, req)
            });
        }
    };
};

const headOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Check if item exist
            const item = await Model.findById(req.params.id);

            // Set appropriate headers with collection metadata
            // res.set({
            res
                .status(200)
                .header({
                    'X-44-id': item.id || req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                });

            // HEAD request returns headers only, no body
            res.status(200).end();
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

const optionOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            optionsHeader = options.optionsHeader || config44.optionsHeader
            console.log('optionsHeader===');
            console.log(optionsHeader);
            res
                .status(204)
                .header(optionsHeader)
                .end();
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

const getOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Find bakery by ID
            const result = await Model.findById(req.params.id);

            // Return 404 if bakery not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'X-44-id': req.params.id || 'N/A',
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
                    'X-44-id': result.id || req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                })
                .json({
                    success: true,
                    metadata: metadataResponse(200, req),
                    data: result
                });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Server error while fetching item',
                message: error.message || 'Server error',
                metadata: metadataResponse(500, req)
            });
        }
    };
};

const updateOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Find and update bakery with validation
            const result = await Model.findByIdAndUpdate(req.params.id, req.body, {
                new: false,
                runValidators: true
            });

            // Return 404 if bakery not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'X-44-id': req.params.id || 'N/A',
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
                    // 'x-user-role': req.user?.role || 'guest',
                    'X-44-id': result.id || req.params.id,
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                })
                .json({
                    success: true,
                    message: 'Item updated successfully',
                    metadata: metadataResponse(200, req),
                    data: result
                });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Server error while updating item',
                message: error.message || 'Server error',
                metadata: metadataResponse(500, req)
            });
        }
    };
};

const replaceOne = function (Model, options = {}) {
    return async function (req, res) {
        try {
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

            // Return 404 if bakery not found
            if (!result) {
                return res
                    .status(404)
                    .header({
                        'X-44-id': req.params.id || 'N/A',
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
                    // TODO: 44-id
                    'X-Response-Time': `${Date.now() - req._startTime}ms`,
                })
                .json({
                    success: true,
                    message: 'Item replaced successfully',
                    metadata: metadataResponse(200, req),
                    data: result
                });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Server error while replacing item',
                message: error.message || 'Server error',
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
                        'X-44-id': req.params.id || 'N/A',
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
                        'X-44-id': result.id || req.params.id,
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
            if (req.query.softDelete === 'false' || req.query.hardDelete === true) {
                // HardDelete the document
                await Model.findByIdAndDelete(req.params.id);

                res
                    .status(204)
                    .header({
                        'X-44-id': result.id || req.params.id,
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
                        'X-44-id': result.id || req.params.id,
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
            res.status(500).json({
                success: false,
                error: 'Server error while deleting item',
                message: error.message || 'Server error',
                metadata: metadataResponse(500, req)
            });
        }
    };
};

const bulkHead = function (Model, options = {}) {
    return async function (req, res) {
        try {
            // Get total count of items
            const totalCount = await Model.countDocuments();

            // Get the last modified date of the collection
            const lastModifiedDoc = await Model.findOne()
                .sort({ updatedAt: -1 })
                .select('updatedAt')
                .lean();

            // Set custom metadata headers
            res
                .header({
                    'X-Total-Count': totalCount.toString(),
                    'X-Response-Time': `${Date.now() - req._startTime}ms`
                });

            // Add last modified header if documents exist
            if (lastModifiedDoc) {
                res.set('X-Last-Modified', new Date(lastModifiedDoc.updatedAt).toUTCString());
            }

            // Expose custom headers for CORS
            // res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Last-Modified');

            // HEAD request returns headers only, no body
            res.status(200).end();
        } catch (error) {
            res.status(500).end();
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
//     res.status(500).set('X-Error', 'Internal Server Error').end();
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
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: error.message || 'Server error',
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
                return res.status(400).json({
                    success: false,
                    error: 'Request body must contain a non-empty array of items'
                });
            }

            // Insert multiple documents (ordered: stops on first error)
            const createdItems = await Model.insertMany(items, { ordered: true });

            res.status(201).json({
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
            res.status(500).json({
                success: false,
                error: 'Failed to create items in bulk',
                message: error.message || 'Server error',
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
                return res.status(400).json({
                    success: false,
                    error: 'Request body must contain a non-empty array of items updates',
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

            res.status(200).json({
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
            res.status(500).json({
                success: false,
                error: 'Failed to update items in bulk',
                message: error.message || 'Server error',
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
                return res.status(400).json({
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

            res.status(200).json({
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
            res.status(500).json({
                success: false,
                error: 'Failed to replace items in bulk',
                message: error.message || 'Server error',
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
                return res.status(400).json({
                    success: false,
                    error: 'Request body must contain a non-empty array of item IDs to delete',
                    metadata: metadataResponse(400, req)
                });
            }

            // Optional: validate that all IDs are valid ObjectIds
            const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({
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

                res.status(200).json({
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
                    return res.status(403).json({
                        success: false,
                        error: 'Not authorized to bulk delete items',
                        metadata: metadataResponse(403, req)
                    });
                }

                result = await Model.deleteMany({ _id: { $in: ids } });

                res.status(200).json({
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
            res.status(500).json({
                success: false,
                error: 'Failed to delete items in bulk',
                message: error.message || 'Server error',
                metadata: metadataResponse(500, req)
            });
        }
    };
};

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
    bulkDelete
};

// export const advancedSearch = (Model, options = {}) => async (req, res) => {
//     try {

//     } catch (error) {
//         console.error(error)
//     }
// };

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

// .header({
//     'X-Total-Count': total,
//     'X-Total-Pages': totalPages,
//     'X-Current-Page': page,
//     'X-Per-Page': limit,
// })
// res.status(500)
// .set('X-Error', 'Internal Server Error')

// options.config44.optionsHeader

// 'X-Last-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString()
// Accept-Patch: application/json
// Accept-Post: application/json
// Content-Encoding:
// Content-Language:
// Content-Length:
// Last-Modified:
// Status: 200 OK

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

// /last
// lastModifiedDoc
// .select('updatedAt')
// res.set('X-Last-Modified', new Date(lastModifiedDoc.updatedAt).toUTCString());

// -res-
// success: false,
// message: "Server Error",
// error: error.message,






