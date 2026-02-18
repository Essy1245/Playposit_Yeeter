// Playposit Yeeter Content Script

console.log("Playposit Yeeter loaded.");

// Configuration
const SKIP_INTERVAL_MS = 100; // How often to skip
const SKIP_AMOUNT_S = 1;      // How much to skip per interval

let fastStepInterval = null;
let currentVideo = null;

function init() {
    createFastStepButton();
    startObserver();
    // Also run once immediately in case the video is already there
    checkForVideoAndExtras();
}

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
        // Stop it
        stopFastStep();
        btn.textContent = 'FastStep';
        btn.classList.remove('active');
    } else {
        // Start it
        currentVideo = document.querySelector('video');
        if (!currentVideo) {
            alert("No video found to fast step!");
            return;
        }

        // Ensure video is playing
        if (currentVideo.paused) {
            currentVideo.play().then(() => {
                startFastStepLoop();
            }).catch(err => {
                console.error("Could not play video:", err);
                // If we can't play, we probably can't fast step effectively if the intention is to skip *while* playing.
                // But requirement says "until video is paused by something else".
                // So we might need to force play.
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

        // If paused by something else (e.g. question popup), stop.
        // NOTE: We just called play() above. If it's paused NOW, it must be "something else".
        // However, we need to be careful not to catch our own pause if we were to pause it. 
        // But we are only seeking. Seeking usually doesn't pause unless buffering.
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

        // Perform the skip
        if (currentVideo.currentTime + SKIP_AMOUNT_S < currentVideo.duration) {
            currentVideo.currentTime += SKIP_AMOUNT_S;
        } else {
            // Near the end
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
    const video = document.querySelector('video');
    if (video) {
        // Expose controls
        if (!video.controls) {
            video.controls = true;
            console.log("Exposed video controls.");
        }
        // Remove custom overlay that blocks clicks
        // "noUI-handle" mentioned by user, but often it's a wrapper.
        const blockers = document.querySelectorAll('.noUI-handle, .vjs-control-bar, .pp-ui-click-layer, .pp-ui-layer');
        blockers.forEach(el => {
            // We want to hide these to allow interaction with the underlying video if possible,
            // or just to remove visual clutter. 
            // Note: PlayPosit might re-add them.
            if (el.style.display !== 'none') {
                el.style.display = 'none';
            }
        });

        // Strategy 2: If there's a specific overlay that captures clicks, we might need to set pointer-events: none on it.
        // However, finding the exact overlay class is tricky without live access.
        // Based on "noUI-handle", it's likely a slider handle. 
        // Let's also try to find any div that is absolutely positioned over the video and hide it, 
        // BUT we must be careful not to hide the video itself if it's wrapped.

        // For now, let's stick to the specific classes and maybe specific attributes.

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

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
