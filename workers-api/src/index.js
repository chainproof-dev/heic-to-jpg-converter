/**
 * HEIC to JPG Conversion API
 * Cloudflare Worker Entry Point
 * 
 * Premium, production-ready API for converting HEIC images to JPG/PNG/WebP
 */

import { handleConvert } from './handlers/convert.js';
import { handleHealth } from './handlers/health.js';
import { handleOptions } from './handlers/options.js';
import { corsHeaders, handleCors } from './utils/cors.js';
import { jsonResponse, errorResponse } from './utils/response.js';

/**
 * Main request router
 */
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return handleCors(request, env);
        }

        try {
            // Route requests
            switch (true) {
                // Health check
                case path === '/health' && method === 'GET':
                    return handleHealth(request, env);

                // API options/capabilities
                case path === '/options' && method === 'GET':
                    return handleOptions(request, env);

                // Convert endpoint
                case path === '/convert' && method === 'POST':
                    return handleConvert(request, env, ctx);

                // API info (root)
                case path === '/' && method === 'GET':
                    return jsonResponse({
                        name: 'HEIC to JPG API',
                        version: env.API_VERSION || '1.0.0',
                        endpoints: {
                            'POST /convert': 'Convert HEIC to JPG/PNG/WebP',
                            'GET /health': 'Health check',
                            'GET /options': 'Available conversion options'
                        },
                        documentation: 'https://heictojpg.pics/api/docs'
                    }, 200, env);

                // 404 for unknown routes
                default:
                    return errorResponse('Not Found', 404, 'ROUTE_NOT_FOUND', env);
            }
        } catch (error) {
            console.error('Unhandled error:', error);
            return errorResponse(
                env.DEBUG === 'true' ? error.message : 'Internal Server Error',
                500,
                'INTERNAL_ERROR',
                env
            );
        }
    }
};
