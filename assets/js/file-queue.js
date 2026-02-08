/**
 * File Queue Manager
 * Manages batch file processing with status tracking
 */

const FileQueue = (() => {
    // File status enum
    const Status = {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETE: 'complete',
        ERROR: 'error',
        CANCELLED: 'cancelled'
    };

    // Internal state
    let files = new Map();
    let listeners = new Set();
    let idCounter = 0;

    /**
     * Create a new file entry
     */
    function createEntry(file) {
        const id = `file_${++idCounter}`;

        const entry = {
            id,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: Status.PENDING,
            progress: 0,
            error: null,
            result: null,
            outputSize: 0,
            startTime: null,
            endTime: null,
            preview: null
        };

        files.set(id, entry);
        notifyListeners('added', entry);

        return entry;
    }

    /**
     * Add files to queue
     */
    function addFiles(fileList) {
        const entries = [];

        for (const file of fileList) {
            // Validate file type
            const isHeic = file.name.toLowerCase().endsWith('.heic') ||
                file.name.toLowerCase().endsWith('.heif') ||
                file.type === 'image/heic' ||
                file.type === 'image/heif';

            if (isHeic) {
                entries.push(createEntry(file));
            }
        }

        return entries;
    }

    /**
     * Update file status
     */
    function updateStatus(id, status, data = {}) {
        const entry = files.get(id);
        if (!entry) return null;

        entry.status = status;

        if (data.progress !== undefined) entry.progress = data.progress;
        if (data.error !== undefined) entry.error = data.error;
        if (data.result !== undefined) entry.result = data.result;
        if (data.outputSize !== undefined) entry.outputSize = data.outputSize;
        if (data.preview !== undefined) entry.preview = data.preview;

        if (status === Status.PROCESSING && !entry.startTime) {
            entry.startTime = Date.now();
        }

        if (status === Status.COMPLETE || status === Status.ERROR) {
            entry.endTime = Date.now();
        }

        notifyListeners('updated', entry);
        return entry;
    }

    /**
     * Set progress for a file
     */
    function setProgress(id, progress) {
        return updateStatus(id, Status.PROCESSING, { progress });
    }

    /**
     * Mark file as complete
     */
    function setComplete(id, result, outputSize, preview) {
        return updateStatus(id, Status.COMPLETE, {
            progress: 100,
            result,
            outputSize,
            preview
        });
    }

    /**
     * Mark file as error
     */
    function setError(id, error) {
        return updateStatus(id, Status.ERROR, { error: error.message || error });
    }

    /**
     * Get file entry by ID
     */
    function get(id) {
        return files.get(id);
    }

    /**
     * Get all files
     */
    function getAll() {
        return Array.from(files.values());
    }

    /**
     * Get pending files
     */
    function getPending() {
        return getAll().filter(f => f.status === Status.PENDING);
    }

    /**
     * Get completed files
     */
    function getCompleted() {
        return getAll().filter(f => f.status === Status.COMPLETE);
    }

    /**
     * Remove file from queue
     */
    function remove(id) {
        const entry = files.get(id);
        if (entry) {
            // Revoke blob URL if exists
            if (entry.result) {
                URL.revokeObjectURL(entry.result);
            }
            if (entry.preview) {
                URL.revokeObjectURL(entry.preview);
            }

            files.delete(id);
            notifyListeners('removed', entry);
        }
    }

    /**
     * Clear all files
     */
    function clear() {
        for (const entry of files.values()) {
            if (entry.result) URL.revokeObjectURL(entry.result);
            if (entry.preview) URL.revokeObjectURL(entry.preview);
        }
        files.clear();
        notifyListeners('cleared', null);
    }

    /**
     * Get queue statistics
     */
    function getStats() {
        const all = getAll();
        const completed = all.filter(f => f.status === Status.COMPLETE);

        return {
            total: all.length,
            pending: all.filter(f => f.status === Status.PENDING).length,
            processing: all.filter(f => f.status === Status.PROCESSING).length,
            completed: completed.length,
            errors: all.filter(f => f.status === Status.ERROR).length,
            totalInputSize: all.reduce((sum, f) => sum + f.size, 0),
            totalOutputSize: completed.reduce((sum, f) => sum + f.outputSize, 0),
            totalTime: completed.reduce((sum, f) => sum + (f.endTime - f.startTime), 0)
        };
    }

    /**
     * Add event listener
     */
    function addListener(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
    }

    /**
     * Notify all listeners
     */
    function notifyListeners(event, data) {
        for (const listener of listeners) {
            try {
                listener(event, data);
            } catch (e) {
                console.error('Queue listener error:', e);
            }
        }
    }

    return {
        Status,
        addFiles,
        updateStatus,
        setProgress,
        setComplete,
        setError,
        get,
        getAll,
        getPending,
        getCompleted,
        remove,
        clear,
        getStats,
        addListener
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileQueue;
}
