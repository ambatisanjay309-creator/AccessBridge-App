/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AccessBridge — alerts.js                                    ║
 * ║  Visual Sound Alert System for hearing-impaired users        ║
 * ║  Converts audio notifications into visible screen effects:   ║
 * ║  - Full-screen color flash                                   ║
 * ║  - Slide-down alert banner with dismiss                      ║
 * ║  - Alert history log                                         ║
 * ║  - Configurable intensity and color                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

// ═══════════════════════════════════
// ALERT CONFIGURATION
// Maps alert types to display properties
// ═══════════════════════════════════
const ALERT_CONFIGS = {
  info: {
    color:     '#3B82F6',
    textColor: '#1D4ED8',
    bg:        '#EFF6FF',
    border:    '#BFDBFE',
    label:     'Info',
  },
  warning: {
    color:     '#F59E0B',
    textColor: '#92400E',
    bg:        '#FFFBEB',
    border:    '#FDE68A',
    label:     'Warning',
  },
  danger: {
    color:     '#EF4444',
    textColor: '#991B1B',
    bg:        '#FEF2F2',
    border:    '#FECACA',
    label:     'Emergency',
  },
  success: {
    color:     '#10B981',
    textColor: '#065F46',
    bg:        '#F0FDF4',
    border:    '#BBF7D0',
    label:     'Success',
  },
  doorbell: {
    color:     '#8B5CF6',
    textColor: '#5B21B6',
    bg:        '#F5F3FF',
    border:    '#DDD6FE',
    label:     'Doorbell',
  },
  phone: {
    color:     '#06B6D4',
    textColor: '#0E7490',
    bg:        '#ECFEFF',
    border:    '#A5F3FC',
    label:     'Phone',
  },
};

// ═══════════════════════════════════
// ALERT STATE
// ═══════════════════════════════════
let alertBannerTimeout = null;
let alertFlashTimeout  = null;
let alertCount = 0;

// ═══════════════════════════════════
// TRIGGER A VISUAL ALERT
// This is the main entry point.
// @param {string} type     - One of the ALERT_CONFIGS keys
// @param {string} title    - Short title (e.g. "New Message")
// @param {string} message  - Longer description
// ═══════════════════════════════════
function triggerVisualAlert(type, title, message) {
  const config = ALERT_CONFIGS[type] || ALERT_CONFIGS.info;
  const intensity = getFlashIntensity();
  const flashColor = getFlashColor(config.color);

  // 1. Screen flash effect (if enabled)
  if (AppState.screenFlashEnabled !== false) {
    triggerScreenFlash(type, intensity);
  }

  // 2. Alert banner (slides down from header)
  if (AppState.bannerAlertsEnabled !== false) {
    showAlertBanner(title, message, config);
  }

  // 3. Log to alert history
  addToAlertLog(type, title, message, config);

  // 4. Screen reader announcement (ARIA live region)
  announceToScreenReader(`${config.label} alert: ${title}. ${message}`);

  // 5. Update caption bar with alert text if active
  updateCaption(`🔔 ${title}: ${message}`);
}

// ═══════════════════════════════════
// SCREEN FLASH
// Animates the full-screen overlay
// ═══════════════════════════════════
function triggerScreenFlash(type, intensity) {
  const overlay = document.getElementById('visual-alert-overlay');
  if (!overlay) return;

  // Clear any existing animation
  overlay.className = '';
  clearTimeout(alertFlashTimeout);

  // Apply intensity via opacity modifier
  const opacityMap = { 1: '0.25', 2: '0.5', 3: '0.75' };
  overlay.style.setProperty('--flash-opacity', opacityMap[intensity] || '0.5');

  // Trigger reflow to restart animation
  void overlay.offsetWidth;
  overlay.classList.add(`flash-${type}`);

  // Clean up class after animation completes
  alertFlashTimeout = setTimeout(() => {
    overlay.className = '';
  }, 2000);
}

// ═══════════════════════════════════
// ALERT BANNER
// Slides in from below the header
// ═══════════════════════════════════
function showAlertBanner(title, message, config) {
  const banner    = document.getElementById('alert-banner');
  const titleEl   = document.getElementById('alert-banner-title');
  const msgEl     = document.getElementById('alert-banner-msg');

  if (!banner || !titleEl || !msgEl) return;

  // Style banner to match alert type
  banner.style.borderTop = `4px solid ${config.color}`;

  titleEl.textContent = title;
  msgEl.textContent   = message;

  // Show the banner
  banner.removeAttribute('hidden');

  // Small delay so CSS transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.classList.add('show');
    });
  });

  // Auto-dismiss after 6 seconds
  clearTimeout(alertBannerTimeout);
  alertBannerTimeout = setTimeout(() => {
    dismissAlert();
  }, 6000);
}

// ═══════════════════════════════════
// ALERT LOG ENTRY
// Adds a timestamped entry to the history
// ═══════════════════════════════════
function addToAlertLog(type, title, message, config) {
  const log = document.getElementById('alert-log');
  if (!log) return;

  // Remove placeholder text on first entry
  const placeholder = log.querySelector('.log-placeholder');
  if (placeholder) placeholder.remove();

  // Format current time
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  alertCount++;

  // Create log entry
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <div>
      <strong>${escapeHTML(title)}</strong>
      <div style="font-size:0.82rem;opacity:0.8;margin-top:2px;">${escapeHTML(message)}</div>
    </div>
  `;

  // Insert at top (newest first)
  log.insertBefore(entry, log.firstChild);

  // Keep log from growing unbounded
  const entries = log.querySelectorAll('.log-entry');
  if (entries.length > 20) {
    entries[entries.length - 1].remove();
  }
}

// ═══════════════════════════════════
// CLEAR ALERT LOG
// ═══════════════════════════════════
function clearAlertLog() {
  const log = document.getElementById('alert-log');
  if (!log) return;
  log.innerHTML = '<p class="log-placeholder">Triggered alerts will appear here…</p>';
  alertCount = 0;
  announceToScreenReader('Alert history cleared');
}

// ═══════════════════════════════════
// FLASH INTENSITY CONTROL
// Reads from the intensity slider (1–3)
// ═══════════════════════════════════
function getFlashIntensity() {
  const slider = document.getElementById('flash-intensity');
  return parseInt(slider?.value || 2);
}

function getFlashColor(defaultColor) {
  const select = document.getElementById('flash-color');
  const choice = select?.value || 'default';
  const colorMap = {
    yellow: '#FCD34D',
    white:  '#FFFFFF',
    cyan:   '#22D3EE',
    default: defaultColor,
  };
  return colorMap[choice] || defaultColor;
}

// ═══════════════════════════════════
// BIND SETTINGS CONTROLS
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Flash intensity label
  const flashSlider = document.getElementById('flash-intensity');
  if (flashSlider) {
    flashSlider.addEventListener('input', () => {
      const labels = { '1': 'Low', '2': 'Medium', '3': 'High' };
      const label = document.getElementById('flash-value');
      if (label) label.textContent = labels[flashSlider.value] || 'Medium';
    });
  }

  // Banner toggle
  const bannerToggle = document.getElementById('banner-toggle');
  if (bannerToggle) {
    bannerToggle.addEventListener('click', () => {
      const current = bannerToggle.getAttribute('aria-checked') === 'true';
      const next = !current;
      bannerToggle.setAttribute('aria-checked', String(next));
      AppState.bannerAlertsEnabled = next;
      const thumb = bannerToggle.querySelector('.toggle-thumb');
      announceToScreenReader(next ? 'Alert banners enabled' : 'Alert banners disabled');
    });
  }

  // Screen flash toggle
  const flashToggle = document.getElementById('screen-flash-toggle');
  if (flashToggle) {
    flashToggle.addEventListener('click', () => {
      const current = flashToggle.getAttribute('aria-checked') === 'true';
      const next = !current;
      flashToggle.setAttribute('aria-checked', String(next));
      AppState.screenFlashEnabled = next;
      announceToScreenReader(next ? 'Screen flash enabled' : 'Screen flash disabled');
    });
  }
});

// ═══════════════════════════════════
// UTILITY: Safe HTML escape
// Prevents XSS when rendering user text
// ═══════════════════════════════════
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ═══════════════════════════════════
// EXPOSE PUBLIC API
// ═══════════════════════════════════
window.triggerVisualAlert = triggerVisualAlert;
window.clearAlertLog = clearAlertLog;
