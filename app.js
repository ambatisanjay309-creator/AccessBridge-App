/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AccessBridge — app.js                                       ║
 * ║  Core application logic: state, keyboard shortcuts,          ║
 * ║  reading guide, caption bar, and global coordination         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

// ═══════════════════════════════════════════════════
// GLOBAL APPLICATION STATE
// Centralized state object for all features
// ═══════════════════════════════════════════════════
const AppState = {
  captionsEnabled: false,
  readingGuideEnabled: false,
  currentTheme: 'default',
  fontSize: 16,
  dyslexiaMode: false,
  reducedMotion: false,
  enhancedFocus: false,
  largeCursor: false,
  lineSpacing: false,
  letterSpacing: false,
  bannerAlertsEnabled: true,
  screenFlashEnabled: true,
};

// ═══════════════════════════════════════════════════
// DOM READY — Initialize everything
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();      // Restore saved preferences
  initToolbar();       // Header quick-toolbar buttons
  initKeyboardShortcuts(); // Alt+key shortcuts
  initReadingGuide();  // Mouse-tracking guide line
  initCaptionBar();    // Live caption toggle
  initSmoothScroll();  // Smooth anchor navigation
  announcePageLoad();  // Screen reader welcome message
});

// ═══════════════════════════════════════════════════
// SETTINGS PERSISTENCE
// Saves/loads from localStorage so settings survive
// page refreshes and new sessions.
// ═══════════════════════════════════════════════════
function saveSettings() {
  try {
    localStorage.setItem('accessbridge-settings', JSON.stringify(AppState));
  } catch (e) {
    // localStorage may be unavailable in private browsing
    console.warn('Could not save settings:', e);
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('accessbridge-settings');
    if (!saved) return;
    const parsed = JSON.parse(saved);
    Object.assign(AppState, parsed);
    applyAllSettings();
  } catch (e) {
    console.warn('Could not load settings:', e);
  }
}

/**
 * Applies the entire AppState to the DOM.
 * Called once on load, and after reset.
 */
function applyAllSettings() {
  applyTheme(AppState.currentTheme);
  applyFontSize(AppState.fontSize);
  applyDyslexiaMode(AppState.dyslexiaMode);
  applyReducedMotion(AppState.reducedMotion);
  applyEnhancedFocus(AppState.enhancedFocus);
  applyLargeCursor(AppState.largeCursor);
  applyLineSpacing(AppState.lineSpacing);
  applyLetterSpacing(AppState.letterSpacing);

  // Sync toolbar button states
  syncToggleButton('btn-captions', AppState.captionsEnabled);
  syncToggleButton('btn-reading-guide', AppState.readingGuideEnabled);
  syncToggleButton('btn-dyslexia', AppState.dyslexiaMode);

  if (AppState.captionsEnabled) {
    document.getElementById('caption-bar').removeAttribute('hidden');
  }
  if (AppState.readingGuideEnabled) {
    document.getElementById('reading-guide').classList.add('active');
  }
}

// ═══════════════════════════════════════════════════
// QUICK TOOLBAR (header buttons)
// ═══════════════════════════════════════════════════
function initToolbar() {
  // Font size decrease
  document.getElementById('btn-font-down').addEventListener('click', () => {
    const newSize = Math.max(12, AppState.fontSize - 2);
    applyFontSize(newSize);
    saveSettings();
  });

  // Font size increase
  document.getElementById('btn-font-up').addEventListener('click', () => {
    const newSize = Math.min(32, AppState.fontSize + 2);
    applyFontSize(newSize);
    saveSettings();
  });

  // Dyslexia font toggle
  document.getElementById('btn-dyslexia').addEventListener('click', () => {
    AppState.dyslexiaMode = !AppState.dyslexiaMode;
    applyDyslexiaMode(AppState.dyslexiaMode);
    syncToggleButton('btn-dyslexia', AppState.dyslexiaMode);
    saveSettings();
    announceToScreenReader(AppState.dyslexiaMode ? 'Dyslexia-friendly font enabled' : 'Dyslexia font disabled');
  });

  // Contrast cycling
  const themes = ['default', 'dark', 'high-contrast', 'deuteranopia', 'tritanopia', 'monochrome'];
  document.getElementById('btn-contrast').addEventListener('click', () => {
    const idx = themes.indexOf(AppState.currentTheme);
    const nextTheme = themes[(idx + 1) % themes.length];
    applyTheme(nextTheme);
    saveSettings();
    announceToScreenReader(`Theme: ${nextTheme.replace('-', ' ')}`);
  });

  // Reading guide toggle
  document.getElementById('btn-reading-guide').addEventListener('click', () => {
    AppState.readingGuideEnabled = !AppState.readingGuideEnabled;
    const guide = document.getElementById('reading-guide');
    guide.classList.toggle('active', AppState.readingGuideEnabled);
    syncToggleButton('btn-reading-guide', AppState.readingGuideEnabled);
    saveSettings();
    announceToScreenReader(AppState.readingGuideEnabled ? 'Reading guide enabled' : 'Reading guide disabled');
  });

  // Captions toggle
  document.getElementById('btn-captions').addEventListener('click', () => {
    toggleCaptions();
  });
}

// ═══════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// Alt + key combinations for hands-free control
// ═══════════════════════════════════════════════════
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only trigger if Alt is held
    if (!e.altKey) return;

    switch (e.key.toLowerCase()) {
      case 's':
        e.preventDefault();
        // Speak text — dispatches to TTS module
        if (typeof speakText === 'function') speakText();
        break;

      case 'l':
        e.preventDefault();
        // Toggle listening — dispatches to STT module
        if (typeof toggleListening === 'function') toggleListening();
        break;

      case 'c':
        e.preventDefault();
        toggleCaptions();
        break;

      case 'h':
        e.preventDefault();
        // Toggle high contrast
        const next = AppState.currentTheme === 'high-contrast' ? 'default' : 'high-contrast';
        applyTheme(next);
        saveSettings();
        break;

      case '+':
      case '=':
        e.preventDefault();
        applyFontSize(Math.min(32, AppState.fontSize + 2));
        saveSettings();
        break;

      case '-':
        e.preventDefault();
        applyFontSize(Math.max(12, AppState.fontSize - 2));
        saveSettings();
        break;

      case 'escape':
      case 'Escape':
        // Stop TTS and dismiss alerts
        if (typeof stopSpeech === 'function') stopSpeech();
        dismissAlert();
        break;
    }
  });

  // Escape key (no Alt needed)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (typeof stopSpeech === 'function') stopSpeech();
      dismissAlert();
    }
  });
}

// ═══════════════════════════════════════════════════
// READING GUIDE
// A semi-transparent horizontal band that follows
// the mouse vertically to aid focus while reading.
// ═══════════════════════════════════════════════════
function initReadingGuide() {
  const guide = document.getElementById('reading-guide');

  // Track mouse position and move the guide
  document.addEventListener('mousemove', (e) => {
    if (!AppState.readingGuideEnabled) return;
    const guideHeight = 32;
    guide.style.top = (e.clientY - guideHeight / 2) + 'px';
  });
}

// ═══════════════════════════════════════════════════
// CAPTION BAR
// The always-visible bottom caption strip
// ═══════════════════════════════════════════════════
function initCaptionBar() {
  // Alert dismiss button
  const dismissBtn = document.getElementById('alert-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', dismissAlert);
  }
}

function toggleCaptions() {
  AppState.captionsEnabled = !AppState.captionsEnabled;
  const bar = document.getElementById('caption-bar');

  if (AppState.captionsEnabled) {
    bar.removeAttribute('hidden');
    updateCaption('Captions are now active. Speak or use Text-to-Speech to see captions here.');
  } else {
    bar.setAttribute('hidden', '');
  }

  syncToggleButton('btn-captions', AppState.captionsEnabled);
  saveSettings();
  announceToScreenReader(AppState.captionsEnabled ? 'Live captions enabled' : 'Live captions disabled');
}

/**
 * Updates the caption bar text.
 * Called by TTS and STT modules to pipe their output here.
 * @param {string} text - Caption text to display
 */
function updateCaption(text) {
  if (!AppState.captionsEnabled) return;
  const captionEl = document.getElementById('caption-text');
  if (captionEl) captionEl.textContent = text;
}

// ═══════════════════════════════════════════════════
// THEME APPLICATION
// ═══════════════════════════════════════════════════
function applyTheme(themeName) {
  const body = document.body;
  // Remove all theme classes
  body.classList.remove(
    'theme-default', 'theme-high-contrast', 'theme-dark',
    'theme-deuteranopia', 'theme-tritanopia', 'theme-monochrome'
  );
  body.classList.add(`theme-${themeName}`);
  AppState.currentTheme = themeName;

  // Update theme buttons in settings
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const isActive = btn.dataset.theme === themeName;
    btn.setAttribute('aria-pressed', String(isActive));
    btn.classList.toggle('active', isActive);
  });
}

// ═══════════════════════════════════════════════════
// FONT SIZE APPLICATION
// ═══════════════════════════════════════════════════
function applyFontSize(size) {
  AppState.fontSize = size;
  document.documentElement.style.setProperty('--font-size-base', `${size}px`);
  document.body.style.fontSize = `${size}px`;

  // Update all display elements
  const display = document.getElementById('font-size-display');
  if (display) display.textContent = `${size}px`;
}

// ═══════════════════════════════════════════════════
// DYSLEXIA MODE
// ═══════════════════════════════════════════════════
function applyDyslexiaMode(enabled) {
  AppState.dyslexiaMode = enabled;
  document.body.classList.toggle('dyslexia-mode', enabled);

  // Sync both toggle buttons
  const toggleEl = document.getElementById('dyslexia-toggle');
  if (toggleEl) toggleEl.setAttribute('aria-checked', String(enabled));
  syncToggleButton('btn-dyslexia', enabled);
}

// ═══════════════════════════════════════════════════
// REDUCED MOTION
// ═══════════════════════════════════════════════════
function applyReducedMotion(enabled) {
  AppState.reducedMotion = enabled;
  document.body.classList.toggle('reduce-motion', enabled);
}

// ═══════════════════════════════════════════════════
// ENHANCED FOCUS
// ═══════════════════════════════════════════════════
function applyEnhancedFocus(enabled) {
  AppState.enhancedFocus = enabled;
  document.body.classList.toggle('enhanced-focus', enabled);
}

// ═══════════════════════════════════════════════════
// LARGE CURSOR
// ═══════════════════════════════════════════════════
function applyLargeCursor(enabled) {
  AppState.largeCursor = enabled;
  document.body.classList.toggle('large-cursor', enabled);
}

// ═══════════════════════════════════════════════════
// LINE SPACING
// ═══════════════════════════════════════════════════
function applyLineSpacing(enabled) {
  AppState.lineSpacing = enabled;
  document.body.classList.toggle('increased-line-spacing', enabled);
}

// ═══════════════════════════════════════════════════
// LETTER SPACING
// ═══════════════════════════════════════════════════
function applyLetterSpacing(enabled) {
  AppState.letterSpacing = enabled;
  document.body.classList.toggle('increased-letter-spacing', enabled);
}

// ═══════════════════════════════════════════════════
// SCREEN READER ANNOUNCEMENTS
// Uses an ARIA live region to announce messages
// to screen readers without visual changes.
// ═══════════════════════════════════════════════════
let _liveRegion = null;

function announceToScreenReader(message) {
  if (!_liveRegion) {
    _liveRegion = document.createElement('div');
    _liveRegion.setAttribute('aria-live', 'polite');
    _liveRegion.setAttribute('aria-atomic', 'true');
    _liveRegion.className = 'sr-only';
    _liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
    document.body.appendChild(_liveRegion);
  }
  // Clear then set — ensures re-announcement of same text
  _liveRegion.textContent = '';
  requestAnimationFrame(() => {
    _liveRegion.textContent = message;
  });
}

/**
 * Announces a welcome message when the page loads.
 * Helps screen reader users understand what the page does.
 */
function announcePageLoad() {
  setTimeout(() => {
    announceToScreenReader(
      'AccessBridge loaded. Accessibility platform with text-to-speech, ' +
      'speech-to-text, visual alerts, and display customization. ' +
      'Use Alt+S to speak, Alt+L to listen, Alt+H for high contrast.'
    );
  }, 1000);
}

// ═══════════════════════════════════════════════════
// SYNC TOGGLE BUTTON STATE
// Updates aria-pressed attribute on toolbar buttons
// ═══════════════════════════════════════════════════
function syncToggleButton(id, state) {
  const btn = document.getElementById(id);
  if (btn) btn.setAttribute('aria-pressed', String(state));
}

// ═══════════════════════════════════════════════════
// DISMISS ALERT BANNER
// ═══════════════════════════════════════════════════
function dismissAlert() {
  const banner = document.getElementById('alert-banner');
  if (banner && banner.classList.contains('show')) {
    banner.classList.remove('show');
    setTimeout(() => banner.setAttribute('hidden', ''), 300);
  }
}

// ═══════════════════════════════════════════════════
// SMOOTH SCROLL for nav links
// ═══════════════════════════════════════════════════
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Move focus to the target section
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}

// ═══════════════════════════════════════════════════
// EXPOSE PUBLIC API (used by other modules)
// ═══════════════════════════════════════════════════
window.AppState = AppState;
window.updateCaption = updateCaption;
window.announceToScreenReader = announceToScreenReader;
window.applyTheme = applyTheme;
window.applyFontSize = applyFontSize;
window.applyDyslexiaMode = applyDyslexiaMode;
window.saveSettings = saveSettings;
window.dismissAlert = dismissAlert;
