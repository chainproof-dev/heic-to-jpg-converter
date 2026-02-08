/**
 * Convert Handler
 * Main HEIC to JPG/PNG/WebP conversion endpoint
 */

import { convertHeic } from '../converter.js';
import { errorResponse, imageResponse, getContentType } from '../utils/response.js';
import {
    validateOptions,
    validateFileSize,
    validateContentType,
    validateApiKey,
    generateRequestId
} from '../utils/validation.js';

/**
 * Handle POST /convert
 */
export async function handleConvert(request, env, ctx) {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
        const url = new URL(request.url);

        // 1. Validate API key (if configured)
        const apiKeyValidation = validateApiKey(request, env);
        if (!apiKeyValidation.valid) {
            return errorResponse(apiKeyValidation.error, 401, 'UNAUTHORIZED', env);
        }

        // 2. Validate content type
        const contentType = request.headers.get('Content-Type') || '';
        const contentTypeValidation = validateContentType(contentType);
        if (!contentTypeValidation.valid) {
            return errorResponse(contentTypeValidation.error, 415, 'INVALID_CONTENT_TYPE', env);
        }

        // 3. Validate options
        const optionsValidation = validateOptions(url, env);
        if (!optionsValidation.valid) {
            return errorResponse(optionsValidation.error, 400, 'INVALID_OPTIONS', env);
        }
        const options = optionsValidation.data;

        // 4. Get file data
        let fileBuffer;

        if (contentType.includes('multipart/form-data')) {
            // Handle multipart form data
            const formData = await request.formData();
            const file = formData.get('file') || formData.get('image');

            if (!file) {
                return errorResponse('No file provided in form data', 400, 'NO_FILE', env);
            }

            fileBuffer = await file.arrayBuffer();
        } else {
            // Handle raw binary data
            fileBuffer = await request.arrayBuffer();
        }

        if (!fileBuffer || fileBuffer.byteLength === 0) {
            return errorResponse('Empty file provided', 400, 'EMPTY_FILE', env);
        }

        // 5. Validate file size
        const sizeValidation = validateFileSize(fileBuffer.byteLength, env);
        if (!sizeValidation.valid) {
            return errorResponse(sizeValidation.error, 413, 'FILE_TOO_LARGE', env);
        }

        // 6. Validate HEIC signature (magic bytes)
        const signatureValidation = validateHeicSignature(fileBuffer);
        if (!signatureValidation.valid) {
            return errorResponse(signatureValidation.error, 400, 'INVALID_FILE', env);
        }

        // 7. Perform conversion
        const result = await convertHeic(fileBuffer, options);

        // 8. Return converted image
        const processingTime = Date.now() - startTime;

        return imageResponse(
            result.buffer,
            getContentType(options.format),
            {
                processingTime,
                originalSize: fileBuffer.byteLength,
                outputSize: result.size,
                requestId,
                width: result.width,
                height: result.height
            },
            env
        );

    } catch (error) {
        console.error(`Conversion error [${requestId}]:`, error);

        const processingTime = Date.now() - startTime;

        // Determine error type
        let status = 500;
        let code = 'CONVERSION_ERROR';
        let message = 'Conversion failed';

        if (error.message.includes('WASM')) {
            code = 'WASM_ERROR';
            message = 'WASM module error';
        } else if (error.message.includes('memory')) {
            code = 'MEMORY_ERROR';
            message = 'Out of memory during conversion';
            status = 507;
        } else if (error.message.includes('decode') || error.message.includes('parse')) {
            code = 'DECODE_ERROR';
            message = 'Failed to decode HEIC file';
            status = 400;
        }

        // Include detailed error in debug mode
        if (env.DEBUG === 'true') {
            message = error.message;
        }

        const errorRes = errorResponse(message, status, code, env);

        // Add timing header even on error
        const newHeaders = new Headers(errorRes.headers);
        newHeaders.set('X-Processing-Time', `${processingTime}ms`);
        newHeaders.set('X-Request-ID', requestId);

        return new Response(errorRes.body, {
            status: errorRes.status,
            headers: newHeaders
        });
    }
}

/**
 * Validate HEIC file signature (magic bytes)
 */
function validateHeicSignature(buffer) {
    const view = new DataView(buffer);

    // HEIC files have 'ftyp' at offset 4
    if (buffer.byteLength < 12) {
        return { valid: false, error: 'File too small to be a valid HEIC' };
    }

    // Check for 'ftyp' box
    const ftyp = String.fromCharCode(
        view.getUint8(4),
        view.getUint8(5),
        view.getUint8(6),
        view.getUint8(7)
    );

    if (ftyp !== 'ftyp') {
        return { valid: false, error: 'Invalid HEIC file (missing ftyp box)' };
    }

    // Check for HEIC/HEIF brand
    const brand = String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11)
    );

    const validBrands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif'];
    const isValidBrand = validBrands.some(b => brand.toLowerCase().startsWith(b));

    if (!isValidBrand) {
        return { valid: false, error: `Unsupported image format: ${brand}` };
    }

    return { valid: true };
}
