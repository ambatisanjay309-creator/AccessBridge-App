/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AccessBridge — settings.js                                  ║
 * ║  Display & Accessibility Settings Panel                      ║
 * ║  Controls: themes, font sizes, dyslexia, motion,            ║
 * ║  focus highlight, cursor, line/letter spacing, reading guide ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

// ═══════════════════════════════════
// INITIALIZE SETTINGS PANEL
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initThemeButtons();
  initFontSizeButtons();
  initToggleSwitches();
  initResetButton();
  syncSettingsUI(); // Reflect current AppState in UI
});

// ═══════════════════════════════════
// THEME SELECTION BUTTONS
// ═══════════════════════════════════
function initThemeButtons() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (!theme) return;

      applyTheme(theme);
      saveSettings();
      announceToScreenReader(`Theme changed to ${theme.replace(/-/g, ' ')}`);
    });
  });
}

// ═══════════════════════════════════
// FONT SIZE PRESET BUTTONS
// ═══════════════════════════════════
function initFontSizeButtons() {
  const sizes = { 'fs-sm': 14, 'fs-md': 16, 'fs-lg': 20, 'fs-xl': 24 };

  Object.entries(sizes).forEach(([id, size]) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', () => {
      applyFontSize(size);
      saveSettings();
      announceToScreenReader(`Font size set to ${size} pixels`);

      // Highlight active button
      Object.keys(sizes).forEach(btnId => {
        document.getElementById(btnId)?.classList.remove('btn-primary');
        document.getElementById(btnId)?.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');
    });
  });

  // Set initial active state
  highlightActiveFontBtn();
}

function highlightActiveFontBtn() {
  const sizeToId = { 14: 'fs-sm', 16: 'fs-md', 20: 'fs-lg', 24: 'fs-xl' };
  const activeId = sizeToId[AppState.fontSize];
  if (!activeId) return;

  ['fs-sm', 'fs-md', 'fs-lg', 'fs-xl'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const isActive = id === activeId;
    btn.classList.toggle('btn-primary', isActive);
    btn.classList.toggle('btn-ghost', !isActive);
  });
}

// ═══════════════════════════════════
// TOGGLE SWITCHES
// Generic handler for all toggle-btn elements
// Each maps to an AppState property and an apply function
// ═══════════════════════════════════
const TOGGLE_MAP = [
  {
    id: 'dyslexia-toggle',
    stateKey: 'dyslexiaMode',
    apply: applyDyslexiaMode,
    onMsg:  'OpenDyslexic font enabled',
    offMsg: 'OpenDyslexic font disabled',
  },
  {
    id: 'line-spacing-toggle',
    stateKey: 'lineSpacing',
    apply: applyLineSpacing,
    onMsg:  'Increased line spacing enabled',
    offMsg: 'Line spacing reset',
  },
  {
    id: 'letter-spacing-toggle',
    stateKey: 'letterSpacing',
    apply: applyLetterSpacing,
    onMsg:  'Increased letter spacing enabled',
    offMsg: 'Letter spacing reset',
  },
  {
    id: 'reduce-motion-toggle',
    stateKey: 'reducedMotion',
    apply: applyReducedMotion,
    onMsg:  'Animations reduced',
    offMsg: 'Animations restored',
  },
  {
    id: 'focus-highlight-toggle',
    stateKey: 'enhancedFocus',
    apply: applyEnhancedFocus,
    onMsg:  'Enhanced focus highlight enabled',
    offMsg: 'Focus highlight set to default',
  },
  {
    id: 'reading-guide-toggle2',
    stateKey: 'readingGuideEnabled',
    apply: (val) => {
      AppState.readingGuideEnabled = val;
      const guide = document.getElementById('reading-guide');
      if (guide) guide.classList.toggle('active', val);
      // Sync toolbar button
      const toolbarBtn = document.getElementById('btn-reading-guide');
      if (toolbarBtn) toolbarBtn.setAttribute('aria-pressed', String(val));
    },
    onMsg:  'Reading guide enabled',
    offMsg: 'Reading guide disabled',
  },
  {
    id: 'cursor-toggle',
    stateKey: 'largeCursor',
    apply: applyLargeCursor,
    onMsg:  'Large cursor enabled',
    offMsg: 'Cursor size restored',
  },
];

function initToggleSwitches() {
  TOGGLE_MAP.forEach(({ id, stateKey, apply, onMsg, offMsg }) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', () => {
      const current = btn.getAttribute('aria-checked') === 'true';
      const next = !current;

      btn.setAttribute('aria-checked', String(next));
      AppState[stateKey] = next;
      apply(next);
      saveSettings();
      announceToScreenReader(next ? onMsg : offMsg);
    });
  });
}

// ═══════════════════════════════════
// RESET ALL SETTINGS
// Returns everything to factory defaults
// ═══════════════════════════════════
function initResetButton() {
  const resetBtn = document.getElementById('btn-reset-settings');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    // Confirm before resetting
    if (!confirm('Reset all accessibility settings to default?')) return;

    // Clear localStorage
    try { localStorage.removeItem('accessbridge-settings'); } catch (e) {}

    // Reset AppState to defaults
    Object.assign(AppState, {
      captionsEnabled:      false,
      readingGuideEnabled:  false,
      currentTheme:         'default',
      fontSize:             16,
      dyslexiaMode:         false,
      reducedMotion:        false,
      enhancedFocus:        false,
      largeCursor:          false,
      lineSpacing:          false,
      letterSpacing:        false,
      bannerAlertsEnabled:  true,
      screenFlashEnabled:   true,
    });

    // Re-apply all
    applyAllSettings();
    syncSettingsUI();

    // Hide caption bar
    document.getElementById('caption-bar')?.setAttribute('hidden', '');

    // Reading guide off
    document.getElementById('reading-guide')?.classList.remove('active');

    // Show confirmation
    const confirmEl = document.getElementById('reset-confirm');
    if (confirmEl) {
      confirmEl.textContent = '✅ Settings reset to defaults';
      setTimeout(() => { confirmEl.textContent = ''; }, 3000);
    }

    announceToScreenReader('All settings have been reset to default');
  });
}

// ═══════════════════════════════════
// SYNC SETTINGS UI
// Makes all the UI controls reflect the
// current AppState (called on init and reset)
// ═══════════════════════════════════
function syncSettingsUI() {
  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const isActive = btn.dataset.theme === AppState.currentTheme;
    btn.setAttribute('aria-pressed', String(isActive));
    btn.classList.toggle('active', isActive);
  });

  // Font size display & buttons
  const display = document.getElementById('font-size-display');
  if (display) display.textContent = `${AppState.fontSize}px`;
  highlightActiveFontBtn();

  // All toggle switches
  TOGGLE_MAP.forEach(({ id, stateKey }) => {
    const btn = document.getElementById(id);
    if (btn) btn.setAttribute('aria-checked', String(AppState[stateKey]));
  });

  // Banner & flash toggles in alerts section
  const bannerToggle = document.getElementById('banner-toggle');
  if (bannerToggle) {
    bannerToggle.setAttribute('aria-checked', String(AppState.bannerAlertsEnabled !== false));
  }

  const flashToggle = document.getElementById('screen-flash-toggle');
  if (flashToggle) {
    flashToggle.setAttribute('aria-checked', String(AppState.screenFlashEnabled !== false));
  }
}

/**
 * applyAllSettings is defined in app.js but called by settings.js after reset.
 * Since settings.js loads after app.js, the function is available globally.
 */
