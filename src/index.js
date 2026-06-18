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
const { metadataResponse } = require('./apiResponse.js');

// ============================================================================
// String Utilities
// ============================================================================
const { capitalize } = require('./capitalize.js');
const { toSlug } = require('./toSlug.js');

// ============================================================================
// Date & Time Utilities
// ============================================================================
const { formatDate } = require('./formatDate.js');

// ============================================================================
// Text Processing Utilities
// ============================================================================
const { truncate } = require('./truncate.js');

// ============================================================================
// Geospatial Utilities
// ============================================================================
const { calculateDistance } = require('./calculateDistance.js');

// ============================================================================
// Mongoose & MongoDB Utilities
// ============================================================================
const { isValidObjectId, parseObjectId } = require('./mongoose.js');

const { singularToPlural } = require('./singularToPlural.js');

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
};

module.exports = utils;
