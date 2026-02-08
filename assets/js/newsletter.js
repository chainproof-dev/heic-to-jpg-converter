/**
 * Newsletter Subscription Handler
 * Integrates MailerLite without altering the existing footer design.
 */

(function () {
    'use strict';

    // 1. MailerLite Universal Script (Tracking)
    (function (w, d, e, u, f, l, n) {
        w[f] = w[f] || function () {
            (w[f].q = w[f].q || [])
            .push(arguments);
        }, l = d.createElement(e), l.async = 1, l.src = u,
        n = d.getElementsByTagName(e)[0], n.parentNode.insertBefore(l, n);
    })
        (window, document, 'script', 'https://assets.mailerlite.com/js/universal.js', 'ml');
    ml('account', '2098047');

    // 2. Custom Form Handling
    document.addEventListener('DOMContentLoaded', initNewsletter);

    function initNewsletter() {
        // Find all newsletter forms (in footer or elsewhere)
        const forms = document.querySelectorAll('.newsletter-form');

        forms.forEach(form => {
            // Prevent duplicate initialization
            if (form.dataset.initialized) return;
            form.dataset.initialized = 'true';

            form.addEventListener('submit', handleSubscribe);
        });
    }

    function handleSubscribe(e) {
        e.preventDefault();
        const form = e.target;
        const emailInput = form.querySelector('input[type="email"]');
        const submitBtn = form.querySelector('button[type="submit"]');
        const container = form.closest('.footer-newsletter'); // Targeting container for success message

        const email = emailInput.value.trim();
        if (!email) return;

        // UI: Set loading state
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        // Simple spinner or text
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25" stroke="currentColor" />
                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" stroke-linecap="round" />
            </svg>
        `;

        // Add minimal rotation animation style if not present
        if (!document.getElementById('newsletter-spin-style')) {
            const style = document.createElement('style');
            style.id = 'newsletter-spin-style';
            style.textContent = `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `;
            document.head.appendChild(style);
        }

        // MailerLite Configuration
        const ACCOUNT_ID = '2098047';
        const FORM_ID = '178826912187024480';
        // The URL provided by user: https://assets.mailerlite.com/jsonp/2098047/forms/178826912187024480/subscribe
        const ENDPOINT = `https://assets.mailerlite.com/jsonp/${ACCOUNT_ID}/forms/${FORM_ID}/subscribe`;

        // JSONP Callback Name
        const callbackName = 'ml_callback_' + Date.now();

        // Define global callback
        window[callbackName] = function (response) {
            cleanup();

            if (response.success) {
                showSuccess(container, form);
            } else {
                showError(form, submitBtn, originalBtnContent);
                console.error('Newsletter error:', response);
            }
        };

        // Construct JSONP URL
        // We use the 'jsonp' endpoint which typically supports 'callback' parameter
        // MailerLite specific params: fields[email], ml-submit, anticsrf
        const scriptUrl = `${ENDPOINT}?fields[email]=${encodeURIComponent(email)}&ml-submit=1&anticsrf=true&callback=${callbackName}`;

        // Create script tag
        const script = document.createElement('script');
        script.src = scriptUrl;

        // Error handling for script loading
        script.onerror = function () {
            cleanup();
            showError(form, submitBtn, originalBtnContent);
        };

        document.body.appendChild(script);

        function cleanup() {
            if (script && script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        }
    }

    function showSuccess(container, form) {
        if (!container) {
            // Fallback if no container found
            form.innerHTML = '<p style="color: var(--accent-green); font-weight: bold; padding: 10px 0;">Subscribed successfully! 🎉</p>';
            return;
        }

        // Replace content with success message calling attention to design variables
        // We use inline styles that match the existing CSS variables if possible, or fallbacks
        container.innerHTML = `
            <div class="newsletter-success" style="animation: fadeIn 0.5s ease;">
                <h3 class="footer-heading">Welcome Aboard! 🎉</h3>
                <p class="newsletter-text" style="color: var(--text-bright); margin-bottom: 1rem;">
                    You've successfully joined our specialized list.
                </p>
                <p class="newsletter-text" style="color: var(--text-muted); font-size: 0.85rem;">
                    Keep an eye on your inbox for heic-to-jpg.pics updates.
                </p>
            </div>
        `;
    }

    function showError(form, btn, originalContent) {
        // Reset button
        btn.disabled = false;
        btn.innerHTML = originalContent;

        // Show toast or temporary error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'newsletter-error';
        errorMsg.style.cssText = 'color: #ef4444; font-size: 0.8rem; margin-top: 8px; animation: fadeIn 0.3s;';
        errorMsg.textContent = 'Something went wrong. Please try again.';

        // Remove existing error if any
        const existing = form.querySelector('.newsletter-error');
        if (existing) existing.remove();

        form.appendChild(errorMsg);

        // Auto remove after 3s
        setTimeout(() => {
            if (errorMsg.parentNode) errorMsg.parentNode.removeChild(errorMsg);
        }, 3000);
    }

})();
