/**
 * WASM Loader
 * Handles loading and caching of the WASM module
 * Production version - loads the actual heic_converter WASM module
 */

const WasmLoader = (() => {
    let wasmModule = null;
    let isLoading = false;
    let loadPromise = null;

    // Feature detection
    const features = {
        simd: false,
        threads: false,
        sharedMemory: false
    };

    /**
     * Check if user agent is a bot/crawler
     */
    function isBot() {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent.toLowerCase();
        const bots = [
            'googlebot', 'bingbot', 'yandex', 'baidu', 'duckduckgo',
            'facebook', 'twitter', 'linkedin', 'pinterest', 'slack',
            'whatsapp', 'discord', 'telegram', 'applebot', 'page speed',
            'lighthouse', 'crawler', 'spider', 'robot', 'headless',
            'mediapartners', 'adsbot'
        ];
        return bots.some(bot => ua.includes(bot));
    }

    /**
     * Detect WebAssembly features
     */
    async function detectFeatures() {
        // SIMD detection
        try {
            const simdTest = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
            features.simd = WebAssembly.validate(simdTest);
        } catch (e) {
            features.simd = false;
        }

        // SharedArrayBuffer / threads detection
        features.sharedMemory = typeof SharedArrayBuffer !== 'undefined';
        features.threads = features.sharedMemory &&
            typeof Atomics !== 'undefined' &&
            crossOriginIsolated === true;

        console.log('WASM Features:', features);
        return features;
    }

    /**
     * Load WASM module
     */
    async function load() {
        // Skip loading for bots to save resources
        if (isBot()) {
            console.log('Bot detected, skipping WASM load');
            return null;
        }

        if (wasmModule) {
            return wasmModule;
        }

        if (isLoading) {
            return loadPromise;
        }

        isLoading = true;

        loadPromise = (async () => {
            try {
                await detectFeatures();

                // Load the actual WASM module
                wasmModule = await loadWasmModule();

                console.log('WASM module loaded successfully');
                return wasmModule;
            } catch (error) {
                console.error('Failed to load WASM:', error);
                throw error;
            } finally {
                isLoading = false;
            }
        })();

        return loadPromise;
    }

    /**
     * Load the actual WASM module using dynamic import
     */
    async function loadWasmModule() {
        try {
            // Dynamically import the ES6 module
            const HeicConverterModule = await import('./heic_converter.js');
            const HeicConverter = HeicConverterModule.default;

            // Initialize the WASM module with locateFile to find the .wasm file
            const module = await HeicConverter({
                locateFile: (path) => {
                    if (path.endsWith('.wasm')) {
                        return '/assets/wasm/' + path;
                    }
                    return path;
                }
            });

            console.log('HEIC Converter WASM module initialized');
            return module;
        } catch (error) {
            console.error('Failed to load WASM module:', error);
            throw new Error(`WASM module loading failed: ${error.message}`);
        }
    }

    /**
     * Get loaded module
     */
    function getModule() {
        return wasmModule;
    }

    /**
     * Get feature support
     */
    function getFeatures() {
        return { ...features };
    }

    /**
     * Check if WASM is ready
     */
    function isReady() {
        return wasmModule !== null;
    }

    /**
     * Check if module is a mock (always false in production)
     */
    function isMock() {
        return false;
    }

    return {
        load,
        getModule,
        getFeatures,
        isReady,
        isMock,
        isMock,
        detectFeatures,
        isBot
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WasmLoader;
}
