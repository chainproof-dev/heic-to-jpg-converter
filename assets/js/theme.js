/**
 * Theme Controller
 * Handles dark/light mode with system preference detection
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'heic-theme';
    const THEME_DARK = 'dark';
    const THEME_LIGHT = 'light';
    const THEME_SYSTEM = 'system';

    let currentTheme = THEME_SYSTEM;

    /**
     * Get system preference
     */
    function getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return THEME_LIGHT;
        }
        return THEME_DARK;
    }

    /**
     * Get effective theme (resolves 'system' to actual theme)
     */
    function getEffectiveTheme() {
        if (currentTheme === THEME_SYSTEM) {
            return getSystemPreference();
        }
        return currentTheme;
    }

    /**
     * Apply theme to document
     */
    function applyTheme(theme) {
        const effectiveTheme = theme === THEME_SYSTEM ? getSystemPreference() : theme;

        document.documentElement.setAttribute('data-theme', effectiveTheme);

        // Update meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = effectiveTheme === THEME_LIGHT ? '#f8fafc' : '#1a1b26';
        }

        // Update toggle button icon
        updateToggleButton(effectiveTheme);
    }

    /**
     * Update toggle button appearance
     */
    function updateToggleButton(effectiveTheme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;

        const sunIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>`;

        const moonIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>`;

        toggleBtn.innerHTML = effectiveTheme === THEME_LIGHT ? moonIcon : sunIcon;
        toggleBtn.setAttribute('aria-label', effectiveTheme === THEME_LIGHT ? 'Switch to dark mode' : 'Switch to light mode');
        toggleBtn.setAttribute('title', effectiveTheme === THEME_LIGHT ? 'Dark mode' : 'Light mode');
    }

    /**
     * Toggle theme
     */
    function toggleTheme() {
        const effectiveTheme = getEffectiveTheme();
        const newTheme = effectiveTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;

        currentTheme = newTheme;
        localStorage.setItem(STORAGE_KEY, newTheme);
        applyTheme(newTheme);
    }

    /**
     * Initialize theme system
     */
    function init() {
        // Load saved preference
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && (saved === THEME_DARK || saved === THEME_LIGHT)) {
            currentTheme = saved;
        } else {
            currentTheme = THEME_SYSTEM;
        }

        // Apply initial theme
        applyTheme(currentTheme);

        // Listen for system preference changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
                if (currentTheme === THEME_SYSTEM) {
                    applyTheme(THEME_SYSTEM);
                }
            });
        }

        // Bind toggle button
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external use
    window.ThemeController = {
        toggle: toggleTheme,
        getTheme: getEffectiveTheme
    };
})();
