// Playposit Yeeter Content Script

if (window.playpositYeeterLoaded) {
    console.log("Playposit Yeeter already loaded. Re-running checks.");
    // If we want to toggle or expose controls again, we can.
    // But mainly we want to avoid duplicate listeners or observers if not careful.
    // The existing observer is on document.body.
    // Let's just return to avoid re-initiating observer if it's already running.
    // However, fast step button might be removed if page changed dynamically? Unlikely for single page app without reload.
    // Let's just create the button if missing.
    // We need to ensure these functions are defined globally or accessible if called here.
    // For now, let's assume they are defined within the scope of the content script.
    // If they are defined inside the 'else' block, this call would fail.
    // The most robust way is to define functions globally or ensure they are hoisted/accessible.
    // Given the instruction's structure, it implies the functions are defined within the 'else' block
    // but then calls them from the 'if' block, which is a contradiction for typical JS scope.
    // A common pattern for content scripts is to define functions at the top level,
    // and then wrap the *initialization logic* in the if/else.
    // Let's define the functions first, then wrap the execution.

    // Re-calling these functions here assumes they are defined in the global scope of the content script.
    // If they are defined inside the `else` block, this `if` block would not have access to them.
    // The instruction implies `createFastStepButton()` is defined later, but called here.
    // This suggests the functions should be defined outside the `if/else` block, and only the `init()` call is conditional.
    // Let's adjust the interpretation: the functions themselves are global to the script,
    // and only the *initial execution* of `init()` is guarded.
    // The instruction's `createFastStepButton()` call in the `if` block and then `{{ ... }}` for its definition
    // within the `else` block is problematic.

    // Let's assume the instruction meant to guard the *initialization* of the script,
    // and the functions themselves are always available.
    // So, the functions should remain outside the if/else, and only the `init()` call is conditional.
    // The instruction's provided code snippet is a bit ambiguous on this.
    // I will place the functions outside the if/else, and only the `init()` call and global flag setting inside the else.
    // This makes `checkForVideoAndExtras()` and `createFastStepButton()` available to the `if` block.

    checkForVideoAndExtras();
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
