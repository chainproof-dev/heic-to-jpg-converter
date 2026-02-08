/**
 * Health Check Handler
 * Returns API health status
 */

import { jsonResponse } from '../utils/response.js';

/**
 * Handle GET /health
 */
export async function handleHealth(request, env) {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: env.API_VERSION || '1.0.0',
        environment: env.ENVIRONMENT || 'production',
        checks: {
            api: true,
            wasm: true // Will be verified on first conversion
        }
    };

    return jsonResponse(health, 200, env);
}
