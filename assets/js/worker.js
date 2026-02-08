/**
 * Web Worker for HEIC conversion
 * Runs in a separate thread to avoid blocking the UI
 */

import HeicConverter from './heic_converter.js';

// Worker state
let wasmModule = null;

/**
 * Initialize worker
 */
async function init() {
    try {
        // Load WASM module
        wasmModule = await HeicConverter({
            locateFile: (path) => {
                if (path.endsWith('.wasm')) {
                    return `/assets/wasm/${path}`;
                }
                return path;
            }
        });

        self.postMessage({ type: 'ready' });
    } catch (error) {
        self.postMessage({ type: 'error', error: `Failed to load WASM: ${error.message}` });
    }
}

/**
 * Convert HEIC to JPEG using WASM
 */
async function convertWasm(buffer, options) {
    if (!wasmModule) {
        throw new Error('WASM module not loaded');
    }

    const { quality = 90, fastMode = false } = options;

    // Allocate memory for input
    const inputPtr = wasmModule._malloc(buffer.byteLength);
    const inputArray = new Uint8Array(buffer);
    wasmModule.HEAPU8.set(inputArray, inputPtr);

    // Allocate output pointers
    const outPtrPtr = wasmModule._malloc(4);
    const outSizePtr = wasmModule._malloc(4);

    try {
        // Call WASM function
        const result = wasmModule._heic_to_jpeg(
            inputPtr,
            buffer.byteLength,
            outPtrPtr,
            outSizePtr,
            quality,
            fastMode ? 1 : 0
        );

        if (result !== 0) {
            const errorMsg = wasmModule.ccall('get_last_error', 'string', [], []);
            throw new Error(errorMsg || `Conversion failed with code ${result}`);
        }

        // Read output
        const outPtr = wasmModule.HEAPU32[outPtrPtr / 4];
        const outSize = wasmModule.HEAPU32[outSizePtr / 4]; // This is a 32-bit integer

        // Copy output buffer
        // usage of subarray creates a view, we need a copy because we free the original
        const outputBuffer = new Uint8Array(outSize);
        outputBuffer.set(wasmModule.HEAPU8.subarray(outPtr, outPtr + outSize));

        // Free WASM output
        wasmModule._free_buffer(outPtr);

        return {
            buffer: outputBuffer.buffer,
            preview: null,
            width: 0,
            height: 0
        };
    } finally {
        wasmModule._free(inputPtr);
        wasmModule._free(outPtrPtr);
        wasmModule._free(outSizePtr);
    }
}

/**
 * Handle incoming messages
 */
self.onmessage = async function (e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            await init();
            break;

        case 'convert':
            try {
                self.postMessage({ type: 'progress', data: { progress: 10 } });

                let result;

                // Try WASM first, then native fallback
                if (wasmModule) {
                    result = await convertWasm(data.buffer, data);
                } else {
                    result = await convertNative(data.buffer, data);
                }

                self.postMessage({ type: 'progress', data: { progress: 90 } });

                // Transfer buffer back
                self.postMessage({
                    type: 'complete',
                    data: {
                        buffer: result.buffer,
                        preview: result.preview,
                        width: result.width,
                        height: result.height,
                        fileName: data.fileName.replace(/\.heic$/i, '.jpg')
                    }
                }, [result.buffer]);

            } catch (error) {
                self.postMessage({
                    type: 'error',
                    error: error.message
                });
            }
            break;
    }
};
