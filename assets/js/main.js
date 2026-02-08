/**
 * Main Application Controller
 * Handles UI events and orchestrates the conversion workflow
 */

(function () {
    'use strict';

    // DOM Elements
    let elements = {};

    // Application state
    const state = {
        quality: 95,
        mode: 'maximum',
        isProcessing: false,
        wasmReady: false
    };

    /**
     * Initialize the application
     */
    async function init() {
        // Cache DOM elements
        cacheElements();

        // Bind event listeners
        bindEvents();

        // Initialize file queue listener
        FileQueue.addListener(handleQueueEvent);

        // Initialize worker pool in background (non-blocking)
        initWasmBackground();

        console.log('HEIC → JPG Converter initialized');
    }

    /**
     * Initialize WASM in background without blocking UI
     */
    async function initWasmBackground() {
        try {
            await WorkerPool.init();
            state.wasmReady = true;
            console.log('WASM ready in background');
        } catch (error) {
            console.warn('Worker pool init failed (will retry on first conversion):', error.message);
        }
    }

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            fileQueue: document.getElementById('fileQueue'),
            fileQueueContainer: document.getElementById('fileQueueContainer'),
            queueCount: document.getElementById('queueCount'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            downloadAllBtn: document.getElementById('downloadAllBtn'),
            modeBtns: document.querySelectorAll('.mode-btn'),
            converterSection: document.querySelector('.converter-section'),
            heroText: document.querySelector('.hero-text'),
            controls: document.getElementById('controls'),
            convertAnotherBtn: document.getElementById('convertAnotherBtn')
        };
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        // Drop zone events
        elements.dropZone.addEventListener('click', () => elements.fileInput.click());
        elements.dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                elements.fileInput.click();
            }
        });
        elements.dropZone.addEventListener('dragover', handleDragOver);
        elements.dropZone.addEventListener('dragleave', handleDragLeave);
        elements.dropZone.addEventListener('drop', handleDrop);

        // File input
        elements.fileInput.addEventListener('change', handleFileSelect);

        // Mode buttons
        elements.modeBtns.forEach(btn => {
            btn.addEventListener('click', handleModeSelect);
        });

        // Action buttons
        elements.clearAllBtn.addEventListener('click', handleClearAll);
        elements.downloadAllBtn.addEventListener('click', handleDownloadAll);

        // Convert Another button
        if (elements.convertAnotherBtn) {
            elements.convertAnotherBtn.addEventListener('click', handleConvertAnother);
        }

        // Prevent default drag behavior on document
        document.addEventListener('dragover', e => e.preventDefault());
        document.addEventListener('drop', e => e.preventDefault());
    }

    /**
     * Handle drag over
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.add('drag-over');
    }

    /**
     * Handle drag leave
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');
    }

    /**
     * Handle file drop
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            addFilesToQueue(files);
        }
    }

    /**
     * Handle file input selection
     */
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            addFilesToQueue(files);
        }
        // Reset input
        e.target.value = '';
    }

    /**
     * Handle mode selection
     */
    function handleModeSelect(e) {
        const btn = e.currentTarget;

        // Update button states
        elements.modeBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        // Update state
        state.mode = btn.dataset.mode;
        state.quality = parseInt(btn.dataset.quality, 10);

        console.log(`Mode: ${state.mode}, Quality: ${state.quality}`);
    }

    /**
     * Switch to conversion mode - hide drop zone, show file queue
     */
    function showConversionMode() {
        // Hide the upload UI
        if (elements.heroText) {
            elements.heroText.style.display = 'none';
        }
        if (elements.dropZone) {
            elements.dropZone.style.display = 'none';
        }
        if (elements.controls) {
            elements.controls.style.display = 'none';
        }

        // Add class to converter section for styling
        if (elements.converterSection) {
            elements.converterSection.classList.add('conversion-active');
        }
    }

    /**
     * Switch back to upload mode - show drop zone, hide file queue
     */
    function showUploadMode() {
        // Show the upload UI
        if (elements.heroText) {
            elements.heroText.style.display = '';
        }
        if (elements.dropZone) {
            elements.dropZone.style.display = '';
        }
        if (elements.controls) {
            elements.controls.style.display = '';
        }

        // Remove class from converter section
        if (elements.converterSection) {
            elements.converterSection.classList.remove('conversion-active');
        }
    }

    /**
     * Handle "Convert Another" button click
     */
    function handleConvertAnother() {
        // Clear current queue and return to upload mode
        FileQueue.clear();
    }

    /**
     * Add files to queue
     */
    async function addFilesToQueue(files) {
        const entries = FileQueue.addFiles(files);

        if (entries.length === 0) {
            alert('Please select HEIC or HEIF files');
            return;
        }

        // Show queue and switch to conversion mode
        elements.fileQueueContainer.hidden = false;
        showConversionMode();

        // Ensure WASM is ready before processing
        if (!state.wasmReady) {
            try {
                await WorkerPool.init();
                state.wasmReady = true;
            } catch (error) {
                console.error('Failed to initialize WASM:', error);
            }
        }

        // Start processing
        processQueue();
    }

    /**
     * Process the file queue
     */
    async function processQueue() {
        const pending = FileQueue.getPending();
        if (pending.length === 0) return;

        state.isProcessing = true;

        // Process files in parallel using worker pool
        for (const entry of pending) {
            processFile(entry);
        }
    }

    /**
     * Process a single file
     */
    async function processFile(entry) {
        FileQueue.updateStatus(entry.id, FileQueue.Status.PROCESSING);

        try {
            // Convert using worker pool
            const result = await WorkerPool.convert(entry.file, {
                quality: state.quality,
                fastMode: state.mode === 'balanced',
                onProgress: (progress) => {
                    FileQueue.setProgress(entry.id, progress);
                }
            });

            // Create blob and URL
            const blob = new Blob([result.buffer], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);

            // Create preview URL
            let previewUrl = null;
            if (result.preview) {
                previewUrl = URL.createObjectURL(result.preview);
            } else {
                previewUrl = url;
            }

            // Mark complete
            FileQueue.setComplete(entry.id, url, blob.size, previewUrl);

        } catch (error) {
            console.error('Conversion error:', error);
            FileQueue.setError(entry.id, error);
        }
    }

    /**
     * Handle queue events
     */
    function handleQueueEvent(event, entry) {
        switch (event) {
            case 'added':
                renderFileItem(entry);
                updateQueueCount();
                break;

            case 'updated':
                updateFileItem(entry);
                updateDownloadButton();
                break;

            case 'removed':
                removeFileItem(entry.id);
                updateQueueCount();
                updateDownloadButton();
                break;

            case 'cleared':
                elements.fileQueue.innerHTML = '';
                elements.fileQueueContainer.hidden = true;
                showUploadMode();
                break;
        }
    }

    /**
     * Render a file item in the queue
     */
    function renderFileItem(entry) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.id = `file-${entry.id}`;
        item.setAttribute('role', 'listitem');

        item.innerHTML = `
            <div class="file-preview">
                <span class="file-preview-placeholder">🖼️</span>
            </div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(entry.name)}</div>
                <div class="file-progress" style="display: none;">
                    <div class="file-progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div class="file-status">
                <span class="status-badge status-pending">Pending</span>
            </div>
            <div class="file-actions">
                <button class="btn-icon btn-remove" data-id="${entry.id}" title="Remove" aria-label="Remove ${escapeHtml(entry.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;

        // Bind remove button
        item.querySelector('.btn-remove').addEventListener('click', () => {
            FileQueue.remove(entry.id);
        });

        elements.fileQueue.appendChild(item);
    }

    /**
     * Update a file item in the queue
     */
    function updateFileItem(entry) {
        const item = document.getElementById(`file-${entry.id}`);
        if (!item) return;

        // Update status badge
        const badge = item.querySelector('.status-badge');
        badge.className = `status-badge status-${entry.status}`;
        badge.textContent = getStatusText(entry.status);

        // Update progress bar
        const progressContainer = item.querySelector('.file-progress');
        const progressBar = item.querySelector('.file-progress-bar');

        if (entry.status === FileQueue.Status.PROCESSING) {
            progressContainer.style.display = 'block';
            progressBar.style.width = `${entry.progress}%`;
        } else {
            progressContainer.style.display = 'none';
        }

        // Update preview
        if (entry.preview) {
            const preview = item.querySelector('.file-preview');
            preview.innerHTML = `<img src="${entry.preview}" alt="Preview of ${escapeHtml(entry.name)}">`;
        }

        // Update actions
        const actions = item.querySelector('.file-actions');
        if (entry.status === FileQueue.Status.COMPLETE) {
            actions.innerHTML = `
                <button class="btn-icon btn-download" data-id="${entry.id}" title="Download" aria-label="Download ${escapeHtml(entry.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
                <button class="btn-icon btn-remove" data-id="${entry.id}" title="Remove" aria-label="Remove ${escapeHtml(entry.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;

            // Bind download button
            actions.querySelector('.btn-download').addEventListener('click', () => {
                downloadFile(entry);
            });

            // Bind remove button
            actions.querySelector('.btn-remove').addEventListener('click', () => {
                FileQueue.remove(entry.id);
            });
        } else if (entry.status === FileQueue.Status.ERROR) {
            const statusBadge = item.querySelector('.status-badge');
            statusBadge.title = entry.error;
        }
    }

    /**
     * Remove a file item from the queue
     */
    function removeFileItem(id) {
        const item = document.getElementById(`file-${id}`);
        if (item) {
            item.remove();
        }

        // Hide queue if empty and show upload mode
        if (FileQueue.getAll().length === 0) {
            elements.fileQueueContainer.hidden = true;
            showUploadMode();
        }
    }

    /**
     * Update queue count display
     */
    function updateQueueCount() {
        const stats = FileQueue.getStats();
        elements.queueCount.textContent = stats.total;
    }

    /**
     * Update download button state and text based on file count
     */
    function updateDownloadButton() {
        const completed = FileQueue.getCompleted();
        const total = FileQueue.getAll().length;

        // Disable button if no completed files
        elements.downloadAllBtn.disabled = completed.length === 0;

        // Smart button text: "Download" for single file, "Download All" for multiple
        if (total === 1) {
            // Single file mode - show simple "Download" button
            elements.downloadAllBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
            `;
        } else if (completed.length > 1) {
            // Multiple completed files - show ZIP download option
            elements.downloadAllBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download All (${completed.length})
            `;
        } else {
            // Multiple files but not all completed yet
            elements.downloadAllBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download All
            `;
        }
    }

    /**
     * Download a single file
     */
    function downloadFile(entry) {
        if (!entry.result) return;

        const link = document.createElement('a');
        link.href = entry.result;
        link.download = entry.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Handle clear all button
     */
    function handleClearAll() {
        FileQueue.clear();
    }

    /**
     * Handle download all
     */
    async function handleDownloadAll() {
        const completed = FileQueue.getCompleted();
        if (completed.length === 0) return;

        // Single file - download directly
        if (completed.length === 1) {
            downloadFile(completed[0]);
            return;
        }

        // Multiple files - download as ZIP
        await downloadAsZip(completed);
    }

    /**
     * Download files as ZIP
     */
    async function downloadAsZip(files) {
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            console.warn('JSZip not loaded, downloading files individually');
            for (let i = 0; i < files.length; i++) {
                setTimeout(() => downloadFile(files[i]), i * 100);
            }
            return;
        }

        const zip = new JSZip();
        const downloadBtn = elements.downloadAllBtn;

        // Disable button while creating ZIP
        downloadBtn.disabled = true;
        const originalHtml = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
            </svg>
            Creating ZIP...
        `;

        try {
            for (const entry of files) {
                const response = await fetch(entry.result);
                const blob = await response.blob();
                const fileName = entry.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
                zip.file(fileName, blob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to create ZIP:', error);
            alert('Failed to create ZIP. Downloading files individually.');
            for (let i = 0; i < files.length; i++) {
                setTimeout(() => downloadFile(files[i]), i * 100);
            }
        } finally {
            // Restore button
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalHtml;
        }
    }

    /**
     * Get human-readable status text
     */
    function getStatusText(status) {
        const texts = {
            pending: 'Pending',
            processing: 'Converting...',
            complete: 'Complete',
            error: 'Error',
            cancelled: 'Cancelled'
        };
        return texts[status] || status;
    }

    /**
     * Escape HTML entities
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
