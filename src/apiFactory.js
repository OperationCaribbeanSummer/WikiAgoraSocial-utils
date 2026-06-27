
// head
export const head = (Model, options = {}) => async (req, res) => {
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
        res.header({
            'X-Total-Count': totalCount.toString(),
            'Content-Type': 'application/json'
        });

        // Add last modified header if documents exist
        if (lastModifiedDoc) {
            // res.set('X-Last-Modified', new Date(lastModifiedDoc.updatedAt).toUTCString());
            res.header({
                'X-Last-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString()
            });
        }

        // Expose custom headers for CORS compatibility
        // res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Last-Modified');
        res.header({
            'Access-Control-Expose-Headers': '',
            'X-Total-Count': '',
            'X-Last-Modified': ''
        });

        // HEAD request returns headers only, no body content
        res.status(200).end();
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error while checking items collection',
            message: error.message || 'Server error'
        });
    }
};

// option
export const option = (Model, options = {}) => async (req, res) => {
    try {
        res
            .status(204)
            // .set(config.optionsHeader)
            .header(config44.optionsHeader)
            .json(config44.optionsBody);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Server error while checking items collection',
            message: error.message || 'Server error'
        });
    }
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
export const getAll = (Model, options = {}) => async (req, res) => {
    try {
        // 1. Clone query params
        const reqQuery = { ...req.query };
        console.log('reqQuery===');
        console.log(reqQuery);

        // 2. Remove reserved fields
        const removeFields = [
            'page',
            'sort',
            'limit',
            'fields',
            // 'select',
            // 'search',
            'q',
            'populate'
        ];
        removeFields.forEach(param => delete reqQuery[param]);

        // 3. Convert operators (gte, gt, lte, lt, in)
        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|ne)\b/g, match => `$${match}`);

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
        } else {
            query = query.sort(options.defaultSort || '-createdAt');
        }
        console.log('sort===');
        console.log(sort);

        // 7. Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        // const startIndex = (page - 1) * limit;
        // const endIndex = page * limit;

        // promiseAll()
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
        const results = await query
        // .maxTimeMS(4 * 60 * 1000) // 4 minutes
        // .lean();
        console.log('results===');
        console.log(results);

        // Calculate total pages for navigation
        const totalPages = Math.ceil(total / limit);

        // Build base URL for pagination links
        // BUG: correct baseUrl
        const baseUrl = `${req.protocol}://${req.get('host')}/api/v4/bakery/bakeries`;
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

        // Last page link (only if there are results)
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
        res
            .status(200)
            .header({
                'x-timestamp': Date.now(),
                'X-API-Version': config44.apiVersion, // BUG: correct apiVersion
                'X-Total-Count': total, // TODO: totalCount.toString(),
                'X-Total-Pages': totalPages,
                'X-Current-Page': page,
                'X-Per-Page': limit,
                'x-user-role': req.user.role || 'guest'
            })
            .links(linksHeaders)
            .json({
                success: true,
                message: 'Items retrieved successfully',
                metadata: metadataResponse(200, 'bakeries', req), // BUG: correct metadataResponse
                pagination: {
                    totalItems: total,
                    itemsPerPage: limit,
                    currentPage: page,
                    totalPages: totalPages,
                    startIndex: startIndex,
                    endIndex: Math.min(endIndex, total)
                },
                links: links,
                data: result
            });

        // TODO: delete old pagination and res
        // 10. Pagination metadata
        // const pagination = {
        //     total,
        //     page,
        //     limit,
        //     pages: Math.ceil(total / limit),
        //     hasNext: skip + results.length < total,
        //     hasPrev: page > 1
        // };
        // res.status(200).json({
        //     success: true,
        //     count: results.length,
        //     pagination,
        //     data: results
        // });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve items',
            error: error.message
        });
    }
};

// createOne
export const createOne = (Model, options = {}) => async (req, res) => {
    try {
        // TODO: Add user to req.body for audit trail
        req.body.createdBy = req.user.id;

        // Create new bakery document
        const result = await Model.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            metadata: metadataResponse(201, 'bakeries', req),
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error while creating item',
            message: error.message || 'Server error'
        });
    }
};

// headOne
export const headOne = (Model, options = {}) => async (req, res) => {
    try {
        // Check if item exist
        const item = await Model.findById(req.params.id);

        // Set appropriate headers with collection metadata
        // res.set({
        res.header({
            'Content-Type': 'application/json'
        });

        // HEAD request returns headers only, no body
        res.status(200).end();
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error while checking items collection',
            message: error.message || 'Server error'
        });
    }
};

// optionOne
export const optionOne = (Model, options = {}) => async (req, res) => {
    try {
        res
            .status(204)
            // .set(config44.optionsHeader)
            .header(config44.optionsHeader)
            .end();
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Server error while checking items collection',
            message: error.message || 'Server error'
        });
    }
};

// getOne
export const getOne = (Model, options = {}) => async (req, res) => {
    try {
        // Find bakery by ID
        const result = await Model.findById(req.params.id);

        // Return 404 if bakery not found
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res
            .status(200)
            .header({
                'x-timestamp': Date.now(),
                'X-API-Version': config44.apiVersion,
                'Content-Type': 'application/json',
                'x-user-role': req.user.role || 'guest'
            })
            .json({
                success: true,
                metadata: metadataResponse(200, 'bakeries', req),
                data: result
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error while fetching item',
            message: error.message || 'Server error'
        });
    }
};

// updateOne
export const updateOne = (Model, options = {}) => async (req, res) => {
    try {
        // Find and update bakery with validation
        const result = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: false,
            runValidators: true
        });

        // Return 404 if bakery not found
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res
            .status(200)
            .header({
                'x-timestamp': Date.now(),
                'X-API-Version': config44.apiVersion,
                'Content-Type': 'application/json',
                'x-user-role': req.user.role || 'guest'
            })
            .json({
                success: true,
                message: 'Item updated successfully',
                metadata: metadataResponse(200, 'bakeries', req),
                data: result
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error while updating item',
            message: error.message || 'Server error'
        });
    }
};

// replaceOne
export const replaceOne = (Model, options = {}) => async (req, res) => {
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
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res
            .status(200)
            .header({
                'x-timestamp': Date.now(),
                'X-API-Version': config44.apiVersion,
                'Content-Type': 'application/json',
                'x-user-role': req.user.role || 'guest'
            })
            .json({
                success: true,
                message: 'Item replaced successfully',
                metadata: metadataResponse(200, 'bakeries', req),
                data: result
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error while replacing item',
            message: error.message || 'Server error'
        });
    }
};

// deleteOne
export const deleteOne = (Model, options = {}) => async (req, res) => {
    try {
        // /bulk?soft=false
        // /bulk?soft=true (default)

        req.body.deletedBy = req.user.id;
        req.body.isDeleted = true;
        req.body.deletedAt = new Date();

        // Find the item document
        const result = await Model.findById(req.params.id);

        // Return 404 if not found
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Bakery not found'
            });
        }

        // TODO: user role !== 'guest'
        // TODO: Add user isBlocked=flase
        if (!req.user || !req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this item. User authentication required.'
            });
        }

        // TODO: Add user to req.body for audit trail
        // req.body.updatedBy = req.user.id;
        if (req.query.softDelete === 'false') {
            // HardDelete the document
            await Model.findByIdAndDelete(req.params.id);

            // TODO: send _id
            res
                .status(204)
                .header({
                    'x-timestamp': Date.now(),
                    'X-API-Version': config44.apiVersion,
                    'Content-Type': 'application/json',
                    'x-user-role': req.user.role || 'guest'
                })
                .json({
                    success: true,
                    id: req.params.id,
                    data: null,
                });
        } else {
            // SoftDelete the document
            await Model.findByIdAndUpdate(req.params.id, req.body, {
                new: false,
                runValidators: true
            });

            res
                .status(204)
                .header({
                    'x-timestamp': Date.now(),
                    'X-API-Version': config44.apiVersion,
                    'Content-Type': 'application/json',
                    'x-user-role': req.user.role
                })
                .json({
                    success: true,
                    id: req.params.id,
                    data: null,
                });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error while deleting item',
            message: error.message || 'Server error'
        });
    }
};

// bulkHead
export const bulkHead = (Model, options = {}) => async (req, res) => {
    try {
        // Get total count of items
        const totalCount = await Model.countDocuments();

        // Get the last modified date of the collection
        const lastModifiedDoc = await Model.findOne()
            .sort({ updatedAt: -1 })
            .select('updatedAt')
            .lean();

        // Set custom metadata headers
        // res.set({
        res
            .header({
                'X-Total-Count': totalCount.toString(),
                'x-timestamp': Date.now(),
                'X-API-Version': config44.apiVersion,
                'Content-Type': 'application/json',
                'x-user-role': req.user.role || 'guest'
            });

        // Add last modified header if documents exist
        if (lastModifiedDoc) {
            res.set('X-Last-Modified', new Date(lastModifiedDoc.updatedAt).toUTCString());
        }

        // Expose custom headers for CORS
        res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Last-Modified');

        // HEAD request returns headers only, no body
        res.status(200).end();
    } catch (error) {
        res.status(500).end();
    }
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

// bulkOption
export const bulkOption = (Model, options = {}) => async (req, res) => {
    try {
        // Set CORS and allowed methods headers
        res.setHeader('Allow', config.bulkOptions.allowedMethods.join(', '));
        res.setHeader('Access-Control-Allow-Methods', config44.bulkOptions.allowedMethods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', config44.bulkOptions.allowedHeaders.join(', '));
        res.setHeader('Access-Control-Expose-Headers', config44.bulkOptions.exposedHeaders.join(', '));

        // Return detailed information about bulk operations
        res.status(200).json({
            success: true,
            data: {
                description: 'Bulk operations endpoint',
                allowedMethods: config44.bulkOptions.allowedMethods,
                allowedHeaders: config44.bulkOptions.allowedHeaders,
                exposedHeaders: config44.bulkOptions.exposedHeaders,
                supportedOperations: config44.bulkOptions.supportedOperations,
                notes: config44.bulkOptions.notes
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message || 'Server error'
        });
    }
};

// bulkCreate
export const bulkCreate = (Model, options = {}) => async (req, res) => {
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
            metadata: metadataResponse(201, 'bakeries', req, res), // TODO:
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
            message: error.message || 'Server error'
        });
    }
};

// bulkUpdate
export const bulkUpdate = (Model, options = {}) => async (req, res) => {
    try {
        const items = req.body;

        // Validate payload structure
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Request body must contain a non-empty array of items updates'
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
            metadata: metadataResponse(200, 'bakeries', req, res), // TODO: 
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
            message: error.message || 'Server error'
        });
    }
};

// bulkReplace
export const bulkReplace = (Model, options = {}) => async (req, res) => {
    try {
        const items = req.body;

        // Validate payload structure
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Request body must contain a non-empty array of items replacements'
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
            metadata: metadataResponse(200, 'bakeries', req, res), // TODO: 
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
            message: error.message || 'Server error'
        });
    }
};

// bulkDelete
export const bulkDelete = (Model, options = {}) => async (req, res) => {
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
                error: 'Request body must contain a non-empty array of item IDs to delete'
            });
        }

        // Optional: validate that all IDs are valid ObjectIds
        const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid ObjectId format: ${invalidIds.join(', ')}`
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
                metadata: metadataResponse(200, 'bakeries', req, res),
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
                    error: 'Not authorized to bulk delete items'
                });
            }

            result = await Model.deleteMany({ _id: { $in: ids } });

            res.status(200).json({
                success: true,
                message: `${result.deletedCount} items deleted successfully`,
                metadata: metadataResponse(200, 'bakeries', req, res),
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
            message: error.message || 'Server error'
        });
    }
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

// global44()
// .header({
//     'x-timestamp': Date.now(),
//     'X-API-Version': config44.apiVersion,
//     'x-user-role': req.user.role || 'guest',
// })

// .header({
//     'X-Total-Count': total,
//     'X-Total-Pages': totalPages,
//     'X-Current-Page': page,
//     'X-Per-Page': limit,
//     'Content-Type': 'application/json'
// })
// res.status(500)
// .set('X-Error', 'Internal Server Error')

// config44.optionsHeader

// 'X-Last-Modified': new Date(lastModifiedDoc.updatedAt).toUTCString()
// X-44-id
// Accept-Patch: application/json
// Accept-Post: application/json
// Content-Encoding:
// Content-Language:
// Content-Length:
// Date:
// Last-Modified:
// Status: 200 OK
// Accept-Encoding: gzip, deflate, br, compress
// Accept-Language: en
// Allow: GET, POST, PATCH, DELETE, HEAD, OPTION

// -res-
// {
//   "code": 200,
//   "success": true,
//   "status": "success",
//   "requestId": "abc-123",
//   "apiVersion": "v5",
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
// -a-td-
// if (req.query.isActive !== undefined) {
//     query = query.where('isActive').equals(req.query.isActive === 'true');
// }

// /last
// lastModifiedDoc
// .select('updatedAt')
// res.set('X-Last-Modified', new Date(lastModifiedDoc.updatedAt).toUTCString());

// -res-
// success: false,
// message: "Server Error",
// error: error.message,
