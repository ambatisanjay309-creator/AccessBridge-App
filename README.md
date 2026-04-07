# ⬡ AccessBridge
### NC TSA Software Development — Accessibility Platform

> Breaking Barriers, Building Access. A comprehensive web application removing barriers for users with vision and hearing disabilities.

---

## 🚀 Quick Deploy (Vercel)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Select the repo → click **Deploy** (zero configuration required)
4. Your app is live in ~60 seconds!

## 💻 Run Locally

Just open `index.html` in **Google Chrome** or **Microsoft Edge**.

> ⚠️ Speech features require Chrome or Edge. Firefox has limited Web Speech API support.

---

## ♿ Accessibility Features

### 1. 🔊 Text-to-Speech Engine
- Reads any typed or pasted text aloud using the browser's Web Speech API
- **Voice selector** — choose from all installed system voices
- **Speed control** (0.5× to 2.0×) with live display
- **Pitch control** (0.5 to 2.0) with live display
- **Volume control** (0% to 100%)
- **Live word highlighting** — shows the exact word being spoken
- Pause/resume/stop controls
- Syncs text to the **live caption bar**

### 2. 🎙️ Speech-to-Text Transcription
- Converts spoken words into text in **real time**
- **Continuous listening** — automatically restarts after silence
- **Interim results** — shows partial transcription as you speak
- **10 languages** supported (English, Spanish, French, German, Chinese, Japanese, Korean, Portuguese, Arabic)
- **Copy to clipboard** and **clear transcript** buttons
- Animated microphone visualizer with sound bars
- Syncs to the **live caption bar**

### 3. 💬 Live Caption Bar
- Fixed bottom bar that shows real-time captions from TTS and STT
- Toggle with **CC** button in the header toolbar or **Alt+C**
- Always-visible with high-contrast black background

### 4. ⚡ Visual Sound Alerts (Critical for Hearing Impaired)
- Converts audio-only notifications into **full-screen color flashes**
- **6 alert types**: Message, Warning, Emergency, Success, Doorbell, Phone Call
- **Configurable flash intensity** (Low / Medium / High)
- **Custom flash color** options
- **Slide-down alert banner** with auto-dismiss (6 seconds)
- **Alert history log** with timestamps
- Individual toggles for banner and flash effects

### 5. 🎨 Color & Contrast Modes
- **Default** — clean, warm light theme
- **High Contrast** — black background with high-visibility yellow/white text
- **Dark Mode** — deep navy dark theme
- **Deuteranopia** — color palette for red-green color blindness
- **Tritanopia** — color palette for blue-yellow color blindness
- **Monochrome** — full grayscale

### 6. 🔤 Typography Controls
- **Font size presets**: Small (14px) / Medium (16px) / Large (20px) / XL (24px)
- **Fine-grain controls**: A− / A+ buttons in header toolbar
- **OpenDyslexic font** — specialized font designed to reduce reading errors
- **Increased line spacing** (1.65 → 2.0) for easier reading
- **Increased letter spacing** for improved letter distinction

### 7. 🎯 Motion & Focus Controls
- **Reduce animations** — all CSS transitions/animations disabled
- **Enhanced focus highlight** — larger, more visible keyboard focus ring
- **Reading guide line** — semi-transparent horizontal band follows the mouse
- **Large cursor mode** — enlarged cursor for low vision users

### 8. ⌨️ Full Keyboard Navigation
| Shortcut | Action |
|---|---|
| `Alt + S` | Speak text (TTS) |
| `Alt + L` | Start/Stop listening (STT) |
| `Alt + C` | Toggle live captions |
| `Alt + H` | Toggle high contrast |
| `Alt + +` | Increase font size |
| `Alt + −` | Decrease font size |
| `Escape` | Stop speech / Dismiss alert |
| `Tab` | Navigate between elements |

### 9. 👁️ Screen Reader Support (ARIA)
- All interactive elements have `aria-label` attributes
- Live regions (`aria-live`) for dynamic content updates
- Status announcements for all actions
- Semantic HTML with proper roles
- Skip-to-content link for keyboard users
- `aria-pressed` on toggle buttons
- `aria-checked` on switch controls

### 10. 💾 Persistent Settings
- All settings are saved to `localStorage`
- Settings persist across browser sessions
- One-click "Reset All" returns to defaults

---

## 🗂 File Structure

```
accessbridge/
├── index.html          # Main HTML — semantic, ARIA-rich markup
├── vercel.json         # Vercel deployment configuration
├── css/
│   └── style.css       # All themes, animations, responsive layout
└── js/
    ├── app.js          # Core: state, shortcuts, themes, reading guide
    ├── tts.js          # Text-to-Speech engine
    ├── stt.js          # Speech-to-Text engine
    ├── alerts.js       # Visual Sound Alert system
    └── settings.js     # Settings panel controls
```

---

## 🛡 Standards Compliance

- **WCAG 2.1 AA** compliant color contrast ratios
- **WAI-ARIA 1.1** roles and properties throughout
- **Keyboard navigable** — all functionality accessible without a mouse
- **Responsive** — works on mobile, tablet, and desktop
- **No external dependencies** — pure HTML/CSS/JS, zero npm packages
- **Progressive enhancement** — graceful fallback if Speech APIs unavailable

---

## 🏆 TSA Competition Notes

- **Self-contained**: Copy the folder, open `index.html` — it just works
- **No build step**: No Node.js, no npm, no webpack required
- **Cross-platform**: Runs on any OS with Chrome/Edge
- **Production-ready**: Security headers configured in `vercel.json`
- **Documented**: Every function is commented explaining purpose and behavior

---

*Built for NC TSA Software Development Event*
