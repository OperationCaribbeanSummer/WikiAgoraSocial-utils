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
    bulkCreate,
    bulkDelete,
    bulkReplace,
    bulkUpdate,
    createOne,
    deleteOne,
    getAll,
    getOne,
    replaceOne,
    updateOne,
} = require('./apiFactoryCRUD');

const {
    head,
    activityTimeline,
    advancedFilter,
    aggregate,
    bulkExport,
    bulkHead,
    bulkImport,
    bulkOption,
    categoriesTree,
    discovery,
    diverseSample,
    flaggedContent,
    geoClusters,
    geoSearch,
    getNearby,
    headOne,
    lastModifiedDoc,
    mostEngaged,
    newestDoc,
    notImplemented,
    oldestDoc,
    option,
    optionOne,
    popular,
    previewCard,
    qualityScores,
    random,
    reactionsAnalytics,
    recentlyActive,
    related,
    scheduledContent,
    search,
    shareableLink,
    similar,
    stats,
    stats,
    taxonomy,
    topContent,
    trending,
    weightedRandom
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
        activityTimeline,
        advancedFilter,
        aggregate,
        bulkCreate,
        bulkDelete,
        bulkExport,
        bulkHead,
        bulkImport,
        bulkOption,
        bulkReplace,
        bulkUpdate,
        categoriesTree,
        createOne,
        deleteOne,
        discovery,
        diverseSample,
        flaggedContent,
        geoClusters,
        geoSearch,
        getAll,
        getNearby,
        getOne,
        head,
        headOne,
        lastModifiedDoc,
        mostEngaged,
        newestDoc,
        notImplemented,
        oldestDoc,
        option,
        optionOne,
        popular,
        previewCard,
        qualityScores,
        random,
        reactionsAnalytics,
        recentlyActive,
        related,
        replaceOne,
        scheduledContent,
        search,
        shareableLink,
        similar,
        stats,
        stats,
        taxonomy,
        topContent,
        trending,
        updateOne,
        weightedRandom
    }
};

module.exports = utils;
