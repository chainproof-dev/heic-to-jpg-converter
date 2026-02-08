/**
 * Response Utilities
 * Standardized response helpers for the API
 */

import { corsHeaders } from './cors.js';

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(data, status = 200, env = {}) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...corsHeaders(env)
        }
    });
}

/**
 * Create an error response
 */
export function errorResponse(message, status = 400, code = 'ERROR', env = {}) {
    return new Response(JSON.stringify({
        success: false,
        error: {
            code,
            message,
            status
        }
    }, null, 2), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...corsHeaders(env)
        }
    });
}

/**
 * Create an image response with metadata headers
 */
export function imageResponse(buffer, contentType, metadata = {}, env = {}) {
    const headers = {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...corsHeaders(env)
    };

    // Add metadata headers
    if (metadata.processingTime) {
        headers['X-Processing-Time'] = `${metadata.processingTime}ms`;
    }
    if (metadata.originalSize) {
        headers['X-Original-Size'] = metadata.originalSize.toString();
    }
    if (metadata.outputSize) {
        headers['X-Output-Size'] = metadata.outputSize.toString();
    }
    if (metadata.requestId) {
        headers['X-Request-ID'] = metadata.requestId;
    }
    if (metadata.width) {
        headers['X-Image-Width'] = metadata.width.toString();
    }
    if (metadata.height) {
        headers['X-Image-Height'] = metadata.height.toString();
    }

    return new Response(buffer, {
        status: 200,
        headers
    });
}

/**
 * Get content type for output format
 */
export function getContentType(format) {
    const types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp'
    };
    return types[format.toLowerCase()] || 'image/jpeg';
}
