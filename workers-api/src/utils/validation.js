/**
 * Request Validation Utilities
 * Validates incoming requests and conversion options
 */

/**
 * Validation result type
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string} [error]
 * @property {Object} [data]
 */

/**
 * Validate conversion options from query parameters
 */
export function validateOptions(url, env) {
    const params = url.searchParams;
    const errors = [];

    // Parse options with defaults
    const options = {
        quality: parseInt(params.get('quality') || env.DEFAULT_QUALITY || '90', 10),
        format: (params.get('format') || 'jpg').toLowerCase(),
        width: params.get('width') ? parseInt(params.get('width'), 10) : null,
        height: params.get('height') ? parseInt(params.get('height'), 10) : null,
        fit: params.get('fit') || 'cover',
        fastMode: params.get('fast') === 'true' || params.get('fast') === '1'
    };

    // Validate quality
    if (isNaN(options.quality) || options.quality < 1 || options.quality > 100) {
        errors.push('Quality must be between 1 and 100');
    }

    // Validate format
    const validFormats = ['jpg', 'jpeg', 'png', 'webp'];
    if (!validFormats.includes(options.format)) {
        errors.push(`Format must be one of: ${validFormats.join(', ')}`);
    }

    // Validate dimensions
    if (options.width !== null) {
        if (isNaN(options.width) || options.width < 1 || options.width > 4096) {
            errors.push('Width must be between 1 and 4096');
        }
    }
    if (options.height !== null) {
        if (isNaN(options.height) || options.height < 1 || options.height > 4096) {
            errors.push('Height must be between 1 and 4096');
        }
    }

    // Validate fit mode
    const validFits = ['cover', 'contain', 'fill', 'inside', 'outside'];
    if (!validFits.includes(options.fit)) {
        errors.push(`Fit must be one of: ${validFits.join(', ')}`);
    }

    if (errors.length > 0) {
        return { valid: false, error: errors.join('; ') };
    }

    return { valid: true, data: options };
}

/**
 * Validate file size
 */
export function validateFileSize(size, env) {
    const maxSize = parseInt(env.MAX_FILE_SIZE || '10485760', 10);

    if (size > maxSize) {
        return {
            valid: false,
            error: `File size (${formatBytes(size)}) exceeds maximum allowed (${formatBytes(maxSize)})`
        };
    }

    return { valid: true };
}

/**
 * Validate content type
 */
export function validateContentType(contentType) {
    const validTypes = [
        'image/heic',
        'image/heif',
        'application/octet-stream',
        'multipart/form-data'
    ];

    // Check for valid type prefix
    const isValid = validTypes.some(type =>
        contentType && (contentType.startsWith(type) || contentType.includes(type))
    );

    if (!isValid) {
        return {
            valid: false,
            error: 'Content-Type must be image/heic, image/heif, or application/octet-stream'
        };
    }

    return { valid: true };
}

/**
 * Validate API key if required
 */
export function validateApiKey(request, env) {
    // Skip if no API key configured
    if (!env.API_KEY) {
        return { valid: true };
    }

    const apiKey = request.headers.get('X-API-Key');

    if (!apiKey) {
        return { valid: false, error: 'API key required' };
    }

    if (apiKey !== env.API_KEY) {
        return { valid: false, error: 'Invalid API key' };
    }

    return { valid: true };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate a request ID
 */
export function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
