/**
 * CORS Utility
 * Handles Cross-Origin Resource Sharing headers
 */

/**
 * Get CORS headers based on environment configuration
 */
export function corsHeaders(env) {
    const allowedOrigins = env.ALLOWED_ORIGINS || '*';

    return {
        'Access-Control-Allow-Origin': allowedOrigins,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Request-ID',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Expose-Headers': 'X-Processing-Time, X-Original-Size, X-Output-Size, X-Request-ID'
    };
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(request, env) {
    return new Response(null, {
        status: 204,
        headers: corsHeaders(env)
    });
}

/**
 * Validate origin against allowed origins
 */
export function isOriginAllowed(origin, env) {
    const allowed = env.ALLOWED_ORIGINS || '*';

    if (allowed === '*') return true;

    const allowedList = allowed.split(',').map(o => o.trim());
    return allowedList.includes(origin);
}
