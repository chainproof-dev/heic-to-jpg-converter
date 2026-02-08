/**
 * Options Handler
 * Returns available conversion options and API capabilities
 */

import { jsonResponse } from '../utils/response.js';
import { formatBytes } from '../utils/validation.js';

/**
 * Handle GET /options
 */
export async function handleOptions(request, env) {
    const maxSize = parseInt(env.MAX_FILE_SIZE || '10485760', 10);
    const defaultQuality = parseInt(env.DEFAULT_QUALITY || '90', 10);

    const options = {
        success: true,
        capabilities: {
            inputFormats: ['heic', 'heif'],
            outputFormats: [
                { format: 'jpg', contentType: 'image/jpeg', description: 'JPEG image' },
                { format: 'png', contentType: 'image/png', description: 'PNG image' },
                { format: 'webp', contentType: 'image/webp', description: 'WebP image' }
            ],
            maxFileSize: {
                bytes: maxSize,
                formatted: formatBytes(maxSize)
            },
            maxDimensions: {
                width: 4096,
                height: 4096
            }
        },
        parameters: {
            quality: {
                type: 'integer',
                min: 1,
                max: 100,
                default: defaultQuality,
                description: 'Output quality (1-100, only for JPG/WebP)'
            },
            format: {
                type: 'string',
                values: ['jpg', 'png', 'webp'],
                default: 'jpg',
                description: 'Output format'
            },
            width: {
                type: 'integer',
                min: 1,
                max: 4096,
                default: null,
                description: 'Resize width (optional)'
            },
            height: {
                type: 'integer',
                min: 1,
                max: 4096,
                default: null,
                description: 'Resize height (optional)'
            },
            fit: {
                type: 'string',
                values: ['cover', 'contain', 'fill', 'inside', 'outside'],
                default: 'cover',
                description: 'Resize fit mode'
            },
            fast: {
                type: 'boolean',
                default: false,
                description: 'Enable fast mode (lower quality, faster processing)'
            }
        },
        usage: {
            endpoint: 'POST /convert',
            headers: {
                'Content-Type': 'application/octet-stream or multipart/form-data',
                'X-API-Key': 'Your API key (if required)'
            },
            example: 'POST /convert?quality=90&format=jpg'
        }
    };

    return jsonResponse(options, 200, env);
}
