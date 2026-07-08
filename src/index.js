/**
 * WikiAgoraSocial-utils - Unified Utility Library
 * Core utility functions for the WikiAgora Social ecosystem
 * 
 * @module @operationcaribbeansummer/wikiagorasocial-utils
 * @description Provides API response handling, string manipulation, date formatting,
 * distance calculation, Kafka utilities, Mongoose helpers, and more.
 */

// ============================================================================
// API Response Utilities
// ============================================================================
const { metadataResponse } = require('./apiResponse');

// ============================================================================
// String Utilities
// ============================================================================
const { capitalize } = require('./capitalize');
const { toSlug } = require('./toSlug');

// ============================================================================
// Date & Time Utilities
// ============================================================================
const { formatDate } = require('./formatDate');

// ============================================================================
// Text Processing Utilities
// ============================================================================
const { truncate } = require('./truncate');

// ============================================================================
// Geospatial Utilities
// ============================================================================
const { calculateDistance } = require('./calculateDistance');

// ============================================================================
// Mongoose & MongoDB Utilities
// ============================================================================
const { isValidObjectId, parseObjectId } = require('./mongoose');

const { singularToPlural } = require('./singularToPlural');

const { global44 } = require('./global44');

const {
    aggregate,
    bulkCreate,
    bulkDelete,
    bulkHead,
    bulkOption,
    bulkReplace,
    bulkUpdate,
    createOne,
    deleteOne,
    getAll,
    getNearby,
    getOne,
    head,
    headOne,
    lastModifiedDoc,
    newestDoc,
    notImplemented,
    oldestDoc,
    option,
    optionOne,
    random,
    replaceOne,
    stats,
    updateOne
} = require('./apiFactory');

const utils = {
    // API Response
    metadataResponse,

    // String Utilities
    capitalize,
    toSlug,

    // Date Utilities
    formatDate,

    // Text Utilities
    truncate,

    // Geospatial Utilities
    calculateDistance,

    // Mongoose Utilities
    isValidObjectId,
    parseObjectId,

    // Collection Name Utilities
    singularToPlural,

    // Global Configuration
    global44,

    // API Factory (CRUD & Bulk Operations)
    apiFactory: {
        aggregate,
        bulkCreate,
        bulkDelete,
        bulkHead,
        bulkOption,
        bulkReplace,
        bulkUpdate,
        createOne,
        deleteOne,
        getAll,
        getNearby,
        getOne,
        head,
        headOne,
        lastModifiedDoc,
        newestDoc,
        notImplemented,
        oldestDoc,
        option,
        optionOne,
        random,
        replaceOne,
        stats,
        updateOne
    }
};

module.exports = utils;
