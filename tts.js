/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AccessBridge — tts.js                                       ║
 * ║  Text-to-Speech Engine using Web Speech API                  ║
 * ║  Features: word highlighting, voice selection,               ║
 * ║  speed/pitch/volume, pause/resume, caption sync              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

// ═══════════════════════════════════
// TTS STATE
// ═══════════════════════════════════
const TTS = {
  utterance: null,    // Current SpeechSynthesisUtterance
  voices: [],         // Available voices from browser
  isPaused: false,
  isSpeaking: false,
  words: [],          // Words of the current text
  wordIndex: 0,       // Which word is currently spoken
};

// ═══════════════════════════════════
// INITIALIZE TTS
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  if (!('speechSynthesis' in window)) {
    showTTSError('Your browser does not support Text-to-Speech. Please use Chrome or Edge.');
    return;
  }

  // Load voices — they may load asynchronously
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;

  // Bind UI elements
  bindTTSControls();
});

// ═══════════════════════════════════
// LOAD VOICES
// Populates the voice select dropdown
// ═══════════════════════════════════
function loadVoices() {
  TTS.voices = window.speechSynthesis.getVoices();
  const select = document.getElementById('voice-select');
  if (!select) return;

  select.innerHTML = '';

  if (TTS.voices.length === 0) {
    // Some browsers delay voice loading; try again shortly
    setTimeout(loadVoices, 500);
    return;
  }

  // Sort: English voices first, then by language
  const sorted = [...TTS.voices].sort((a, b) => {
    const aEn = a.lang.startsWith('en') ? 0 : 1;
    const bEn = b.lang.startsWith('en') ? 0 : 1;
    return aEn - bEn || a.name.localeCompare(b.name);
  });

  sorted.forEach((voice, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.default) option.selected = true;
    select.appendChild(option);
  });
}

// ═══════════════════════════════════
// BIND TTS UI CONTROLS
// ═══════════════════════════════════
function bindTTSControls() {
  // Character count
  const textarea = document.getElementById('tts-input');
  if (textarea) {
    textarea.addEventListener('input', () => {
      const count = textarea.value.length;
      const counter = document.getElementById('tts-char-count');
      if (counter) counter.textContent = `${count.toLocaleString()} character${count !== 1 ? 's' : ''}`;
    });

    // Allow Tab to insert spaces in textarea (accessibility aid)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }
    });
  }

  // Speed slider
  const speedRange = document.getElementById('speed-range');
  if (speedRange) {
    speedRange.addEventListener('input', () => {
      const val = parseFloat(speedRange.value).toFixed(1);
      document.getElementById('speed-value').textContent = `${val}×`;
      speedRange.setAttribute('aria-valuenow', val);
    });
  }

  // Pitch slider
  const pitchRange = document.getElementById('pitch-range');
  if (pitchRange) {
    pitchRange.addEventListener('input', () => {
      const val = parseFloat(pitchRange.value).toFixed(1);
      document.getElementById('pitch-value').textContent = val;
      pitchRange.setAttribute('aria-valuenow', val);
    });
  }

  // Volume slider
  const volumeRange = document.getElementById('volume-range');
  if (volumeRange) {
    volumeRange.addEventListener('input', () => {
      const val = Math.round(parseFloat(volumeRange.value) * 100);
      document.getElementById('volume-value').textContent = `${val}%`;
      volumeRange.setAttribute('aria-valuenow', val);
    });
  }

  // Action buttons
  document.getElementById('btn-speak')?.addEventListener('click', speakText);
  document.getElementById('btn-pause')?.addEventListener('click', pauseResumeSpeech);
  document.getElementById('btn-stop')?.addEventListener('click', stopSpeech);
  document.getElementById('btn-clear-tts')?.addEventListener('click', clearTTSInput);
}

// ═══════════════════════════════════
// SPEAK TEXT (main function)
// Reads the textarea content aloud.
// Also syncs to caption bar if enabled.
// ═══════════════════════════════════
function speakText() {
  const textarea = document.getElementById('tts-input');
  const text = textarea?.value?.trim();

  if (!text) {
    setTTSStatus('⚠ Please enter some text to speak.');
    announceToScreenReader('No text entered. Please type something first.');
    return;
  }

  // Stop any current speech first
  window.speechSynthesis.cancel();
  TTS.isSpeaking = false;
  TTS.isPaused = false;

  // Build utterance
  const utterance = new SpeechSynthesisUtterance(text);
  TTS.utterance = utterance;

  // Apply settings from UI
  const voiceSelect = document.getElementById('voice-select');
  if (voiceSelect && TTS.voices.length > 0) {
    const selectedIdx = parseInt(voiceSelect.value);
    if (!isNaN(selectedIdx) && TTS.voices[selectedIdx]) {
      utterance.voice = TTS.voices[selectedIdx];
    }
  }

  utterance.rate   = parseFloat(document.getElementById('speed-range')?.value  || 1);
  utterance.pitch  = parseFloat(document.getElementById('pitch-range')?.value  || 1);
  utterance.volume = parseFloat(document.getElementById('volume-range')?.value || 1);

  // Split text into words for word-by-word highlighting
  TTS.words = text.split(/\s+/);
  TTS.wordIndex = 0;
  showWordHighlight('');

  // ── EVENT HANDLERS ──────────────────

  utterance.onstart = () => {
    TTS.isSpeaking = true;
    setTTSStatus('🔊 Speaking…');
    setSpeakingUIState(true);
    announceToScreenReader('Speech started');
    updateCaption(text.substring(0, 80) + (text.length > 80 ? '…' : ''));
  };

  // Word boundary — highlight current word
  utterance.onboundary = (event) => {
    if (event.name !== 'word') return;
    const charIndex = event.charIndex;
    const charLength = event.charLength || 0;
    const word = text.substring(charIndex, charIndex + charLength);
    if (word) {
      showWordHighlight(word);
      // Keep caption in sync with current word position
      updateCaption(getContextSnippet(text, charIndex));
    }
  };

  utterance.onpause = () => {
    TTS.isPaused = true;
    setTTSStatus('⏸ Paused');
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.innerHTML = '<span aria-hidden="true">▶</span> Resume';
      pauseBtn.setAttribute('aria-label', 'Resume speech');
    }
  };

  utterance.onresume = () => {
    TTS.isPaused = false;
    setTTSStatus('🔊 Speaking…');
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.innerHTML = '<span aria-hidden="true">⏸</span> Pause';
      pauseBtn.setAttribute('aria-label', 'Pause speech');
    }
  };

  utterance.onend = () => {
    TTS.isSpeaking = false;
    TTS.isPaused = false;
    setTTSStatus('✅ Finished speaking');
    setSpeakingUIState(false);
    showWordHighlight('');
    announceToScreenReader('Speech finished');
    updateCaption('');
  };

  utterance.onerror = (event) => {
    // 'interrupted' is not a real error — it happens when speech is cancelled
    if (event.error === 'interrupted' || event.error === 'canceled') return;
    setTTSStatus(`❌ Speech error: ${event.error}`);
    setSpeakingUIState(false);
    console.warn('TTS Error:', event.error);
  };

  window.speechSynthesis.speak(utterance);
}

// ═══════════════════════════════════
// PAUSE / RESUME
// ═══════════════════════════════════
function pauseResumeSpeech() {
  if (!TTS.isSpeaking) return;

  if (TTS.isPaused) {
    window.speechSynthesis.resume();
  } else {
    window.speechSynthesis.pause();
  }
}

// ═══════════════════════════════════
// STOP SPEECH
// ═══════════════════════════════════
function stopSpeech() {
  window.speechSynthesis.cancel();
  TTS.isSpeaking = false;
  TTS.isPaused = false;
  setTTSStatus('⏹ Stopped');
  setSpeakingUIState(false);
  showWordHighlight('');
  updateCaption('');
  announceToScreenReader('Speech stopped');
}

// ═══════════════════════════════════
// CLEAR INPUT
// ═══════════════════════════════════
function clearTTSInput() {
  stopSpeech();
  const textarea = document.getElementById('tts-input');
  if (textarea) textarea.value = '';
  const counter = document.getElementById('tts-char-count');
  if (counter) counter.textContent = '0 characters';
  setTTSStatus('Ready to speak');
  showWordHighlight('');
}

// ═══════════════════════════════════
// UI STATE HELPERS
// ═══════════════════════════════════
function setSpeakingUIState(speaking) {
  const speakBtn = document.getElementById('btn-speak');
  const pauseBtn = document.getElementById('btn-pause');
  const stopBtn  = document.getElementById('btn-stop');

  if (speakBtn) speakBtn.disabled = speaking;
  if (pauseBtn) {
    pauseBtn.disabled = !speaking;
    pauseBtn.innerHTML = '<span aria-hidden="true">⏸</span> Pause';
    pauseBtn.setAttribute('aria-label', 'Pause speech');
  }
  if (stopBtn)  stopBtn.disabled  = !speaking;
}

function setTTSStatus(msg) {
  const statusEl = document.getElementById('tts-status');
  if (statusEl) statusEl.textContent = msg;
}

function showTTSError(msg) {
  setTTSStatus(`❌ ${msg}`);
  const speakBtn = document.getElementById('btn-speak');
  if (speakBtn) speakBtn.disabled = true;
}

// ═══════════════════════════════════
// WORD HIGHLIGHT
// Shows the word currently being spoken
// in the highlight area below the controls
// ═══════════════════════════════════
function showWordHighlight(word) {
  const area = document.getElementById('tts-highlight-area');
  if (!area) return;
  if (!word) {
    area.textContent = TTS.isSpeaking ? '…' : 'Currently speaking word will appear here';
    area.style.color = '';
    return;
  }
  area.textContent = `"${word}"`;
  area.style.color = 'var(--accent-1)';
  area.style.fontStyle = 'normal';
  area.style.fontWeight = '700';
}

// ═══════════════════════════════════
// CONTEXT SNIPPET
// Gets a ~60-char snippet around the
// current character position for captions
// ═══════════════════════════════════
function getContextSnippet(text, charIndex) {
  const start = Math.max(0, charIndex - 20);
  const end   = Math.min(text.length, charIndex + 60);
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet += '…';
  return snippet;
}

// ═══════════════════════════════════
// EXPOSE PUBLIC API
// ═══════════════════════════════════
window.speakText = speakText;
window.stopSpeech = stopSpeech;
window.pauseResumeSpeech = pauseResumeSpeech;
