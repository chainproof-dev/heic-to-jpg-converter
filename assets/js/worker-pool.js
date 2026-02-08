/**
 * Worker Pool
 * Manages a pool of Web Workers for parallel HEIC conversion
 */

const WorkerPool = (() => {
    // Configuration
    const config = {
        maxWorkers: navigator.hardwareConcurrency || 4,
        minWorkers: 1,
        workerScript: '/assets/js/worker.js'
    };

    // State
    let workers = [];
    let taskQueue = [];
    let isInitialized = false;
    let initPromise = null;

    /**
     * Initialize worker pool
     */
    async function init(options = {}) {
        if (isInitialized) return;
        if (initPromise) return initPromise;

        // Skip for bots/crawlers to save resources
        if (typeof WasmLoader !== 'undefined' && WasmLoader.isBot && WasmLoader.isBot()) {
            console.log('Bot detected, skipping worker pool initialization');
            isInitialized = true; // Mark as initialized to prevent retries
            return;
        }

        initPromise = (async () => {
            const numWorkers = Math.min(
                options.maxWorkers || config.maxWorkers,
                config.maxWorkers
            );

            console.log(`Initializing worker pool with ${numWorkers} workers`);

            const workerPromises = [];
            for (let i = 0; i < numWorkers; i++) {
                workerPromises.push(createWorker(i));
            }

            workers = await Promise.all(workerPromises);
            isInitialized = true;

            console.log('Worker pool initialized');
        })();

        return initPromise;
    }

    /**
     * Create a single worker
     */
    async function createWorker(id) {
        return new Promise((resolve, reject) => {
            try {
                const worker = new Worker(config.workerScript, { type: 'module' });

                const workerState = {
                    id,
                    worker,
                    busy: false,
                    currentTask: null
                };

                worker.onmessage = (e) => handleWorkerMessage(workerState, e);
                worker.onerror = (e) => handleWorkerError(workerState, e);

                // Initialize worker
                worker.postMessage({ type: 'init' });

                // Wait for ready signal
                const readyHandler = (e) => {
                    if (e.data.type === 'ready') {
                        worker.removeEventListener('message', readyHandler);
                        resolve(workerState);
                    }
                };
                worker.addEventListener('message', readyHandler);

                // Timeout fallback
                setTimeout(() => {
                    worker.removeEventListener('message', readyHandler);
                    resolve(workerState);
                }, 5000);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle worker message
     */
    function handleWorkerMessage(workerState, event) {
        const { type, data, error, taskId } = event.data;

        switch (type) {
            case 'progress':
                if (workerState.currentTask?.onProgress) {
                    workerState.currentTask.onProgress(data.progress);
                }
                break;

            case 'complete':
                if (workerState.currentTask) {
                    workerState.currentTask.resolve(data);
                }
                workerState.busy = false;
                workerState.currentTask = null;
                processQueue();
                break;

            case 'error':
                if (workerState.currentTask) {
                    workerState.currentTask.reject(new Error(error));
                }
                workerState.busy = false;
                workerState.currentTask = null;
                processQueue();
                break;
        }
    }

    /**
     * Handle worker error
     */
    function handleWorkerError(workerState, error) {
        console.error(`Worker ${workerState.id} error:`, error);

        if (workerState.currentTask) {
            workerState.currentTask.reject(error);
        }

        workerState.busy = false;
        workerState.currentTask = null;
        processQueue();
    }

    /**
     * Convert HEIC file to JPEG
     */
    function convert(file, options = {}) {
        return new Promise((resolve, reject) => {
            const task = {
                file,
                options,
                resolve,
                reject,
                onProgress: options.onProgress
            };

            taskQueue.push(task);
            processQueue();
        });
    }

    /**
     * Process next task in queue
     */
    function processQueue() {
        if (taskQueue.length === 0) return;

        // Find available worker
        const worker = workers.find(w => !w.busy);
        if (!worker) return;

        // Get next task
        const task = taskQueue.shift();
        worker.busy = true;
        worker.currentTask = task;

        // Read file and send to worker
        const reader = new FileReader();

        reader.onload = () => {
            worker.worker.postMessage({
                type: 'convert',
                data: {
                    buffer: reader.result,
                    fileName: task.file.name,
                    quality: task.options.quality || 90,
                    fastMode: task.options.fastMode || false
                }
            }, [reader.result]); // Transfer buffer
        };

        reader.onerror = () => {
            task.reject(new Error('Failed to read file'));
            worker.busy = false;
            worker.currentTask = null;
            processQueue();
        };

        reader.readAsArrayBuffer(task.file);
    }

    /**
     * Get pool status
     */
    function getStatus() {
        return {
            totalWorkers: workers.length,
            busyWorkers: workers.filter(w => w.busy).length,
            queuedTasks: taskQueue.length
        };
    }

    /**
     * Terminate all workers
     */
    function terminate() {
        for (const workerState of workers) {
            workerState.worker.terminate();
        }
        workers = [];
        taskQueue = [];
        isInitialized = false;
        initPromise = null;
    }

    return {
        init,
        convert,
        getStatus,
        terminate
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkerPool;
}
