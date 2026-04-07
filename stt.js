/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AccessBridge — stt.js                                       ║
 * ║  Speech-to-Text Engine using Web Speech Recognition API      ║
 * ║  Features: continuous listening, interim results,            ║
 * ║  multi-language, transcript copy, caption sync               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

'use strict';

// ═══════════════════════════════════
// STT STATE
// ═══════════════════════════════════
const STT = {
  recognition: null,  // SpeechRecognition instance
  isListening: false,
  transcript: '',     // Full accumulated transcript
  interimText: '',    // Current in-progress phrase
};

// ═══════════════════════════════════
// INITIALIZE STT
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setSTTStatus('⚠ Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    const listenBtn = document.getElementById('btn-listen');
    if (listenBtn) {
      listenBtn.disabled = true;
      listenBtn.title = 'Not supported in this browser';
    }
    return;
  }

  // Create recognition instance
  STT.recognition = new SpeechRecognition();
  configureRecognition();
  bindSTTControls();
});

// ═══════════════════════════════════
// CONFIGURE RECOGNITION
// Sets up all recognition settings and
// event handlers on the recognition object
// ═══════════════════════════════════
function configureRecognition() {
  const r = STT.recognition;

  r.continuous      = true;   // Keep listening until stopped
  r.interimResults  = true;   // Show partial results in real time
  r.maxAlternatives = 1;      // Only need the top alternative

  // Language from dropdown
  const langSelect = document.getElementById('stt-language');
  r.lang = langSelect?.value || 'en-US';

  // ── EVENT HANDLERS ──────────────────

  r.onstart = () => {
    STT.isListening = true;
    setListeningUIState(true);
    setSTTStatus('🎙️ Listening… speak clearly into your microphone');
    announceToScreenReader('Listening started. Speak now.');
    animateSoundBars(true);
  };

  // onresult fires for every recognized utterance
  r.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript   = '';

    // Process all results since the last event
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text   = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += text + ' ';
      } else {
        interimTranscript += text;
      }
    }

    // Append final text to the permanent transcript
    if (finalTranscript) {
      STT.transcript += finalTranscript;
      renderTranscript();
      updateCaption(finalTranscript.trim()); // Sync to caption bar
    }

    // Show interim text separately (in italic below transcript)
    STT.interimText = interimTranscript;
    renderInterim();
  };

  r.onerror = (event) => {
    // 'no-speech' is normal — just means no sound detected yet
    if (event.error === 'no-speech') return;

    if (event.error === 'not-allowed') {
      setSTTStatus('❌ Microphone access denied. Please allow microphone permission in your browser settings.');
      announceToScreenReader('Microphone permission denied. Please check browser settings.');
    } else if (event.error === 'network') {
      setSTTStatus('❌ Network error. Speech recognition requires an internet connection.');
    } else {
      setSTTStatus(`❌ Recognition error: ${event.error}`);
    }

    STT.isListening = false;
    setListeningUIState(false);
    animateSoundBars(false);
  };

  r.onend = () => {
    // If we're supposed to still be listening, restart
    // (recognition sometimes stops automatically after silence)
    if (STT.isListening) {
      try {
        r.start();
      } catch (e) {
        // Already started — ignore
      }
    } else {
      setSTTStatus('⏹ Stopped. Click "Start Listening" to begin again.');
      setListeningUIState(false);
      animateSoundBars(false);
    }
  };
}

// ═══════════════════════════════════
// BIND STT CONTROLS
// ═══════════════════════════════════
function bindSTTControls() {
  // Start listening button
  document.getElementById('btn-listen')?.addEventListener('click', startListening);

  // Stop listening button
  document.getElementById('btn-stop-listen')?.addEventListener('click', stopListening);

  // Copy transcript button
  document.getElementById('btn-copy-transcript')?.addEventListener('click', copyTranscript);

  // Clear transcript button
  document.getElementById('btn-clear-transcript')?.addEventListener('click', clearTranscript);

  // Language change — update recognition language
  document.getElementById('stt-language')?.addEventListener('change', (e) => {
    if (STT.recognition) {
      STT.recognition.lang = e.target.value;
      if (STT.isListening) {
        stopListening();
        setTimeout(startListening, 300);
      }
    }
  });
}

// ═══════════════════════════════════
// START LISTENING
// ═══════════════════════════════════
function startListening() {
  if (!STT.recognition || STT.isListening) return;

  // Update language before starting
  const langSelect = document.getElementById('stt-language');
  if (langSelect) STT.recognition.lang = langSelect.value;

  try {
    STT.recognition.start();
    STT.isListening = true;
  } catch (e) {
    if (e.name === 'InvalidStateError') {
      // Already running — just update state
      STT.isListening = true;
      setListeningUIState(true);
    } else {
      setSTTStatus(`❌ Could not start recognition: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════
// STOP LISTENING
// ═══════════════════════════════════
function stopListening() {
  if (!STT.recognition) return;
  STT.isListening = false;
  STT.interimText = '';
  renderInterim();
  STT.recognition.stop();
  setListeningUIState(false);
  animateSoundBars(false);
  setSTTStatus('⏹ Stopped. Click "Start Listening" to begin again.');
  announceToScreenReader('Listening stopped.');
}

/**
 * Exported function for keyboard shortcut support.
 * Toggles listening state.
 */
function toggleListening() {
  if (STT.isListening) {
    stopListening();
  } else {
    startListening();
  }
}

// ═══════════════════════════════════
// RENDER TRANSCRIPT
// Updates the transcript display area
// ═══════════════════════════════════
function renderTranscript() {
  const area = document.getElementById('stt-transcript');
  if (!area) return;

  if (!STT.transcript) {
    area.innerHTML = '<span class="transcript-placeholder">Your transcription will appear here in real time…</span>';
    setTranscriptButtonState(false);
    return;
  }

  // Display transcript — escape HTML for safety
  area.textContent = STT.transcript;
  area.scrollTop = area.scrollHeight; // Auto-scroll to bottom

  setTranscriptButtonState(true);
}

// ═══════════════════════════════════
// RENDER INTERIM TEXT
// Shows the in-progress phrase in italic
// ═══════════════════════════════════
function renderInterim() {
  const interim = document.getElementById('stt-interim');
  if (!interim) return;
  interim.textContent = STT.interimText;
}

// ═══════════════════════════════════
// COPY TRANSCRIPT TO CLIPBOARD
// ═══════════════════════════════════
async function copyTranscript() {
  if (!STT.transcript) return;

  try {
    await navigator.clipboard.writeText(STT.transcript.trim());
    setSTTStatus('✅ Transcript copied to clipboard!');
    announceToScreenReader('Transcript copied to clipboard');

    // Reset status after 3 seconds
    setTimeout(() => {
      setSTTStatus(STT.isListening ? '🎙️ Listening…' : 'Ready to listen');
    }, 3000);
  } catch (e) {
    // Fallback: select the text
    const area = document.getElementById('stt-transcript');
    if (area) {
      const range = document.createRange();
      range.selectNode(area);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      setSTTStatus('✅ Transcript copied!');
    }
  }
}

// ═══════════════════════════════════
// CLEAR TRANSCRIPT
// ═══════════════════════════════════
function clearTranscript() {
  STT.transcript  = '';
  STT.interimText = '';
  renderTranscript();
  renderInterim();
  setTranscriptButtonState(false);
  setSTTStatus(STT.isListening ? '🎙️ Listening…' : 'Transcript cleared. Click "Start Listening" to begin.');
  announceToScreenReader('Transcript cleared');
}

// ═══════════════════════════════════
// UI STATE HELPERS
// ═══════════════════════════════════
function setListeningUIState(listening) {
  const startBtn = document.getElementById('btn-listen');
  const stopBtn  = document.getElementById('btn-stop-listen');
  const micIcon  = document.getElementById('mic-icon');
  const soundBars = document.getElementById('sound-bars');

  if (startBtn) startBtn.disabled = listening;
  if (stopBtn)  stopBtn.disabled  = !listening;
  if (micIcon)  micIcon.classList.toggle('listening', listening);
  if (soundBars) soundBars.classList.toggle('listening', listening);
}

function setTranscriptButtonState(hasContent) {
  const copyBtn  = document.getElementById('btn-copy-transcript');
  const clearBtn = document.getElementById('btn-clear-transcript');
  if (copyBtn)  copyBtn.disabled  = !hasContent;
  if (clearBtn) clearBtn.disabled = !hasContent;
}

function setSTTStatus(msg) {
  const statusEl = document.getElementById('stt-status');
  if (statusEl) statusEl.textContent = msg;
}

// ═══════════════════════════════════
// ANIMATE SOUND BARS
// CSS animation toggle for the visualizer
// ═══════════════════════════════════
function animateSoundBars(active) {
  const bars = document.querySelectorAll('#sound-bars .bar');
  bars.forEach((bar, i) => {
    if (active) {
      // Randomize bar heights for a realistic look
      bar.style.animation = `bar-dance ${0.4 + Math.random() * 0.4}s ease-in-out ${i * 0.08}s infinite alternate`;
    } else {
      bar.style.animation = '';
      bar.style.height = '6px';
    }
  });
}

// ═══════════════════════════════════
// EXPOSE PUBLIC API
// ═══════════════════════════════════
window.startListening = startListening;
window.stopListening  = stopListening;
window.toggleListening = toggleListening;
