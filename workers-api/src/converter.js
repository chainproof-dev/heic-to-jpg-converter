/**
 * HEIC Converter for Cloudflare Workers
 * Uses the original Emscripten-generated loader
 */

// The Emscripten-generated module handles its own memory setup
import HeicConverterFactory from './wasm/heic_converter.js';

// Cached module instance
let moduleInstance = null;
let initPromise = null;

/**
 * Initialize the Emscripten WASM module
 */
async function initModule() {
    if (moduleInstance) {
        return moduleInstance;
    }

    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        try {
            console.log('[HEIC] Initializing Emscripten module...');

            // Create the module with custom configuration
            const module = await HeicConverterFactory({
                // Don't print to stdout/stderr in workers
                print: (text) => console.log('[WASM]', text),
                printErr: (text) => console.error('[WASM Error]', text),

                // The locateFile function tells Emscripten where to find the .wasm
                // In Cloudflare Workers, we need to handle this specially
                locateFile: (path) => {
                    // Return the path as-is, Wrangler should bundle it
                    return path;
                },
            });

            moduleInstance = module;
            console.log('[HEIC] Module initialized successfully');
            return module;
        } catch (error) {
            console.error('[HEIC] Module init failed:', error.message);
            initPromise = null;
            throw error;
        }
    })();

    return initPromise;
}

/**
 * Convert HEIC to JPEG
 */
export async function convertHeic(inputBuffer, options = {}) {
    const { quality = 90, fastMode = false } = options;
    const startTime = Date.now();

    const module = await initModule();
    const inputArray = new Uint8Array(inputBuffer);
    const inputSize = inputArray.length;

    console.log('[HEIC] Starting conversion, input size:', inputSize);

    // Allocate input memory
    const inputPtr = module._malloc(inputSize);
    if (!inputPtr) {
        throw new Error('Failed to allocate input memory');
    }

    // Copy input to WASM memory
    module.HEAPU8.set(inputArray, inputPtr);

    // Allocate output pointers
    const outPtrPtr = module._malloc(4);
    const outSizePtr = module._malloc(4);

    try {
        // Call the conversion function
        const result = module._heic_to_jpeg(
            inputPtr,
            inputSize,
            outPtrPtr,
            outSizePtr,
            quality,
            fastMode ? 1 : 0
        );

        if (result !== 0) {
            let errorMsg = 'Conversion failed';
            if (module._get_last_error) {
                const errorPtr = module._get_last_error();
                if (errorPtr) {
                    errorMsg = module.UTF8ToString(errorPtr);
                }
            }
            throw new Error(`${errorMsg} (code: ${result})`);
        }

        // Read output
        const outPtr = module.HEAPU32[outPtrPtr >> 2];
        const outSize = module.HEAPU32[outSizePtr >> 2];

        if (!outPtr || outSize === 0) {
            throw new Error('Conversion produced empty output');
        }

        console.log('[HEIC] Conversion complete, output size:', outSize);

        // Copy output
        const output = new Uint8Array(outSize);
        output.set(module.HEAPU8.subarray(outPtr, outPtr + outSize));

        // Free output buffer
        if (module._free_buffer) {
            module._free_buffer(outPtr);
        }

        return {
            buffer: output.buffer,
            size: outSize,
            processingTime: Date.now() - startTime
        };

    } finally {
        module._free(inputPtr);
        module._free(outPtrPtr);
        module._free(outSizePtr);
    }
}

export async function checkWasmHealth() {
    try {
        await initModule();
        return { available: true, error: null };
    } catch (error) {
        return { available: false, error: error.message };
    }
}
