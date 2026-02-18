## Disclaimers

This tool is for educational purposes and personal productivity. Please respect your institution's academic integrity policies.
This project is AI-driven. Gemini 3 Pro is in charge of this project. 

# Playposit Yeeter

Playposit Yeeter is a Chrome Extension designed to improve the quality of life when dealing with PlayPosit video assignments, specifically for students who want more control over the playback experience.

## Features

- **Auto-Start**: Automatically starts the video if it is not playing when the extension is activated.
- **Auto-Stop & Chime**: Automatically stops fast-forwarding when the video is paused (e.g., by a question) and plays chimes to alert you.
- **FastStep**: A dedicated button to "fast-forward" through videos rapidly (skipping 2 seconds every 100ms) until a question pops up or the video pauses.
- **Expose Native Controls**: Removes custom PlayPosit overlays (`noUI-handle`, blocking layers) and forces the native HTML5 video controls to appear.
- **Canvas Integration**: Works seamlessly within Canvas LMS assignments (*.instructure.com).
- **Background Play**: Does its thing even when you look away. 

## Installation

1.  Clone or download this repository.
2.  Open Chrome and go to `chrome://extensions`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the project directory.

## Usage

1.  Navigate to a Canvas assignment page containing a PlayPosit video.
2.  **Start the video** and ensure it is playing.
3.  Click the **Playposit Yeeter** extension icon in your Chrome toolbar.
4.  The **FastStep** button will appear in the top-right corner of the video player, and native video controls will become visible.
4.  Click **FastStep** to speed through non-interactive sections.

## Roadmap

### Current Status (v1.0)
- [x] Bypass PlayPosit custom controls to show native seek bar/volume.
- [x] Fast-forward functionality ("FastStep").
- [x] Audible feedback (chime) when FastStep pauses.
- [x] Background Play
- [x] Support for Canvas iframes.

### Future Goals (v2.0+)

- [ ] **Automated Question Solving (Brute Force)**:
    - [ ] Detect multiple-choice questions.
    - [ ] Attempt options until correct (for assignments with unlimited attempts).
    - [ ] Record correct answers and re-apply them on subsequent attempts/syncs.

- [ ] **LLM Integration**:
    - [ ] User-provided API Key support (OpenAI/Gemini).
    - [ ] Capture screenshot of current video frame + question text.
    - [ ] Query LLM for answers to complex/open-ended questions.
    - [ ] Granular settings to exclude personal/subjective questions.


### Eventually...
- [ ] **Put this thing on the Chrome Web Store**


