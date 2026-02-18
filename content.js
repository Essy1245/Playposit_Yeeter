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
                console.log("Video paused or ended, stopping FastStep.");
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

            // 2. Expose controls and bring to front
            if (!video.controls) {
                video.controls = true;
            }
            // Aggressive z-index to show default controls
            video.style.zIndex = "2147483647";
            video.style.position = "relative"; // Ensure z-index applies if not already positioned

            // 3. Remove blockers
            // Hiding known overlay classes
            const blockers = document.querySelectorAll('.noUI-handle, .vjs-control-bar, .pp-ui-click-layer, .pp-ui-layer, .pp-ui-standard, .playposit-video-controls, .vjs-big-play-button');
            blockers.forEach(el => {
                if (el.style.display !== 'none') {
                    el.style.display = 'none';
                }
            });

            const overlay = document.querySelector('.video-overlay');
            if (overlay) overlay.style.display = 'none';
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
