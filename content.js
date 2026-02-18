// Playposit Yeeter Content Script
(function () {
    if (window.playpositYeeterLoaded) {
        console.log("Playposit Yeeter already loaded. Re-checking.");
        if (window.playpositYeeter) {
            window.playpositYeeter.checkForVideoAndExtras();
            window.playpositYeeter.createFastStepButton();
        }
        return;
    }

    window.playpositYeeterLoaded = true;
    console.log("Playposit Yeeter initializing...");

    // Inject the visibility spoofer into the main world
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);

    // Configuration
    const SKIP_INTERVAL_MS = 100; // How often to skip
    const SKIP_AMOUNT_S = 2;      // How much to skip per interval

    let fastStepInterval = null;
    let currentVideo = null;

    function createFastStepButton() {
        if (document.getElementById('fast-step-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'fast-step-btn';
        btn.textContent = 'FastStep';
        btn.addEventListener('click', toggleFastStep);
        document.body.appendChild(btn);
    }

    function toggleFastStep() {
        const btn = document.getElementById('fast-step-btn');

        if (fastStepInterval) {
            stopFastStep();
            btn.textContent = 'FastStep';
            btn.classList.remove('active');
        } else {
            currentVideo = document.querySelector('video');
            if (!currentVideo) {
                alert("No video found to fast step!");
                return;
            }

            if (currentVideo.paused) {
                currentVideo.play().then(() => {
                    startFastStepLoop();
                }).catch(err => {
                    console.error("Could not play video:", err);
                });
            } else {
                startFastStepLoop();
            }

            btn.textContent = 'Stepping...';
            btn.classList.add('active');
        }
    }

    function startFastStepLoop() {
        if (fastStepInterval) clearInterval(fastStepInterval);

        fastStepInterval = setInterval(() => {
            if (!currentVideo) {
                stopFastStep();
                return;
            }

            if (currentVideo.paused || currentVideo.ended) {
                console.log("Video paused (likely by question or user), stopping FastStep.");
                stopFastStep();
                const btn = document.getElementById('fast-step-btn');
                if (btn) {
                    btn.textContent = 'FastStep';
                    btn.classList.remove('active');
                }
                return;
            }

            if (currentVideo.currentTime + SKIP_AMOUNT_S < currentVideo.duration) {
                currentVideo.currentTime += SKIP_AMOUNT_S;
            } else {
                currentVideo.currentTime = currentVideo.duration;
            }

        }, SKIP_INTERVAL_MS);
    }

    function stopFastStep() {
        if (fastStepInterval) {
            clearInterval(fastStepInterval);
            fastStepInterval = null;
            playChimeSequence(3);
        }
    }

    function playChimeSequence(count) {
        if (count <= 0) return;
        playChime();
        setTimeout(() => playChimeSequence(count - 1), 400);
    }

    function playChime() {
        // Simple beep/chime using Web Audio API
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // Slide to A5

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }

    function checkForVideoAndExtras() {
        // Log to help debug which frame we are in
        console.log(`Checking for video in frame: ${window.location.href}`);

        const video = document.querySelector('video');
        if (video) {
            console.log("Video found!", video);

            // 1. Create button only if video exists
            createFastStepButton();

            // 1.5 Auto-start if needed
            if (video.paused && video.currentTime < 0.5) {
                console.log("Video seemingly not started. Attempting auto-start...");
                // Try to find big play buttons
                const playBtns = document.querySelectorAll('.vjs-big-play-button, .play-button, .pp-ui-big-play-button, button[title="Play Video"]');
                playBtns.forEach(btn => {
                    // Only click if visible-ish
                    if (btn.offsetParent !== null && btn.style.display !== 'none') {
                        console.log("Clicking big play button:", btn);
                        btn.click();
                    }
                });

                // Also try direct play if no button or button didn't work immediately
                // However, play() might fail without user interaction. 
                // But the user interaction IS clicking the extension, so we are in a trusted event loop?
                // No, content script runs after the click, but the `run_command` logic implies direct execution? 
                // The content script logic runs after `chrome.scripting.executeScript`.
                // This is triggered by user click, so it counts as user activation!
                video.play().catch(e => console.log("Direct play() failed (expected if waiting for overlay):", e));
            }

            // 2. Expose controls
            if (!video.controls) {
                video.controls = true;
            }

            // Revert aggressive styling that might break layout
            // We focus on removing the blockers instead.
            // If we really need z-index, we should check if it's covered.
            // But usually hiding the overlays is enough.
            // If the video is hidden, it might be due to position relative moving it out of flex/grid flow or absolute container.

            // Let's try to just ensure it's visible but not move it.
            video.style.visibility = 'visible';
            video.style.opacity = '1';

            // 3. Remove blockers / Enable interaction
            // Instead of hiding elements (which might hide the video if it's nested inside), 
            // we make them transparent to clicks.

            // Major layers that might wrap the video: make them see-through for clicks
            const wrappers = document.querySelectorAll('.pp-ui-layer, .pp-ui-click-layer, .pp-ui-standard');
            wrappers.forEach(el => {
                el.style.pointerEvents = 'none';
            });

            // Specific controls that block view or interaction: hide them or make them click-through
            // "noUI-handle" and "control-bar" are overlaid controls, safe to hide usually, 
            // but if we just want native controls, avoiding display:none is safer for layout.
            const controls = document.querySelectorAll('.noUI-handle, .vjs-control-bar, .playposit-video-controls, .vjs-big-play-button');
            controls.forEach(el => {
                el.style.display = 'none'; // These are definitely just UI on top
                // Double safety
                el.style.pointerEvents = 'none';
            });

            const overlay = document.querySelector('.video-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                overlay.style.pointerEvents = 'none';
            }
        } else {
            // If we are in the top frame and don't see a video, but see iframes, log it.
            const iframes = document.querySelectorAll('iframe');
            if (iframes.length > 0) {
                console.log("Found iframes. Video might be inside one:", iframes);
            }
        }
    }

    function startObserver() {
        const observer = new MutationObserver((mutations) => {
            checkForVideoAndExtras();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function init() {
        // Remove initial createFastStepButton call. 
        // We defer it to when a video is actually found.
        startObserver();
        checkForVideoAndExtras();
    }

    // Expose methods for re-injection
    window.playpositYeeter = {
        checkForVideoAndExtras,
        createFastStepButton,
        toggleFastStep
    };

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
