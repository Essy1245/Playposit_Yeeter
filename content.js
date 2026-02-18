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
    const SKIP_AMOUNT_S = 1;      // How much to skip per interval

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
        }
    }

    function checkForVideoAndExtras() {
        // Log to help debug which frame we are in
        console.log(`Checking for video in frame: ${window.location.href}`);

        const video = document.querySelector('video');
        if (video) {
            console.log("Video found!", video);

            // 1. Create button only if video exists
            createFastStepButton();

            // 2. Expose controls
            if (!video.controls) {
                video.controls = true;
                console.log("Exposed video controls.");
            }

            // 3. Remove blockers
            const blockers = document.querySelectorAll('.noUI-handle, .vjs-control-bar, .pp-ui-click-layer, .pp-ui-layer, .pp-ui-standard');
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
