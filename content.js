// Playposit Yeeter Content Script
(function () {
    if (window.playpositYeeterLoaded) {
        console.log("Playposit Yeeter already loaded. Re-checking.");
        if (window.playpositYeeter) {
            window.playpositYeeter.checkForVideoAndExtras();
            window.playpositYeeter.createFastStepButton();
            window.playpositYeeter.createSolveButton();
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
    const SKIP_INTERVAL_MS = 90; // How often to skip
    const SKIP_AMOUNT_S = 5;      // How much to skip per interval

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

    function createSolveButton() {
        if (document.getElementById('solve-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'solve-btn';
        btn.textContent = 'Solve';
        btn.style.marginLeft = '10px';
        btn.addEventListener('click', toggleSolve);
        document.body.appendChild(btn);
    }

    function updateFastStepButton(active) {
        const btn = document.getElementById('fast-step-btn');
        if (!btn) return;

        if (active) {
            btn.textContent = 'Stepping...';
            btn.classList.add('active');
        } else {
            btn.textContent = 'FastStep';
            btn.classList.remove('active');
        }
    }

    function toggleFastStep() {
        if (fastStepInterval) {
            stopFastStep();
            updateFastStepButton(false);
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

            updateFastStepButton(true);
        }
    }

    function toggleSolve() {
        if (guesser.active) {
            guesser.stop();
        } else {
            guesser.start();
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
                updateFastStepButton(false);
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

    function ensureVideoPlays(video) {
        if (video.hasAttribute('data-yeeter-monitoring')) return;
        video.setAttribute('data-yeeter-monitoring', 'true');

        console.log("Starting aggressive autoplay monitor for video (in 1.5s)", video);

        // Wait a solid second (1.5s) before interfering, to let player load/hydrate
        setTimeout(() => {
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds

            const interval = setInterval(() => {
                if (!video.isConnected) {
                    clearInterval(interval);
                    return;
                }

                if (!video.paused && video.currentTime > 0 && !video.ended) {
                    console.log("Video is playing correctly. Stopping monitor.");
                    clearInterval(interval);
                    // Ensure FastStep is ready
                    startFastStepLoop();
                    updateFastStepButton(true);
                    return;
                }

                attempts++;
                if (attempts > maxAttempts) {
                    console.log("Autoplay monitor timed out.");
                    clearInterval(interval);
                    return;
                }

                console.log(`Autoplay attempt ${attempts}/${maxAttempts}`);

                // Try clicking overlays first
                const playBtns = document.querySelectorAll('.vjs-big-play-button, .play-button, .pp-ui-big-play-button, button[title="Play Video"]');
                playBtns.forEach(btn => {
                    if (btn.offsetParent !== null && btn.style.display !== 'none') {
                        console.log("Clicking big play button:", btn);
                        btn.click();
                    }
                });

                // Try direct play
                video.play().then(() => {
                    console.log("Direct play() promise resolved.");
                }).catch(e => {
                    if (e.name !== 'AbortError') console.log("Direct play() failed:", e.message);
                });

                // Ensure controls
                if (!video.controls) video.controls = true;
                video.style.visibility = 'visible';
                video.style.opacity = '1';

            }, 500);
        }, 1500); // 1.5s delay
    }

    function checkForVideoAndExtras() {
        console.log(`Checking for video/interaction in frame: ${window.location.href}`);

        const video = document.querySelector('video');

        // CRITICAL CHECK: Only hook video if it is VISIBLE.
        // PlayPosit pre-loads the video in a hidden div (display: none) while showing the "Start" cover.
        // We must ignore the hidden video and find the Start button instead.
        const isVideoVisible = video && video.offsetParent !== null;

        if (isVideoVisible) {
            // 1. Create buttons only if video exists and is visible
            createFastStepButton();
            createSolveButton();

            // 2. Ensure it plays (Aggressive)
            ensureVideoPlays(video);

            // 3. Remove blockers / Enable interaction
            const wrappers = document.querySelectorAll('.pp-ui-layer, .pp-ui-click-layer, .pp-ui-standard');
            wrappers.forEach(el => {
                el.style.pointerEvents = 'none';
            });

            const controls = document.querySelectorAll('.noUI-handle, .vjs-control-bar, .playposit-video-controls, .vjs-big-play-button');
            controls.forEach(el => {
                el.style.display = 'none';
                el.style.pointerEvents = 'none';
            });

            const overlay = document.querySelector('.video-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                overlay.style.pointerEvents = 'none';
            }
        } else {
            // Case: Video tag missing OR hidden. Look for "Start" buttons.

            // 1. Look for Material Icon "play_arrow" or "play_circle"
            const iconBtns = Array.from(document.querySelectorAll('i.material-icons, i.v-icon'));
            const playIcon = iconBtns.find(el => {
                const text = (el.innerText || el.textContent || '').trim();
                return text === 'play_arrow' || text === 'play_circle_filled' || text === 'play_circle_outline';
            });

            if (playIcon) {
                const btn = playIcon.closest('button') || playIcon.closest('.v-btn') || playIcon.parentElement;
                if (btn && btn.offsetParent !== null) {
                    if (btn.hasAttribute('data-yeeter-clicked')) return;
                    btn.setAttribute('data-yeeter-clicked', 'true');

                    console.log("Found Start Button (Icon - Video Hidden/Missing). Clicking in 1s...", btn);
                    setTimeout(() => btn.click(), 1000);
                    return;
                }
            }

            // 2. Look for text "Start" or "Begin"
            const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
            const startBtn = buttons.find(btn => {
                if (btn.offsetParent === null) return false;
                const t = (btn.innerText || btn.textContent || '').trim().toLowerCase();
                return t === 'start' || t === 'begin';
            });

            if (startBtn) {
                if (startBtn.hasAttribute('data-yeeter-clicked')) return;
                startBtn.setAttribute('data-yeeter-clicked', 'true');

                console.log("Found Start Button (Text - Video Hidden/Missing). Clicking in 1s...", startBtn);
                setTimeout(() => startBtn.click(), 1000);
                return;
            }

            const iframes = document.querySelectorAll('iframe');
            if (iframes.length > 0) {
                // console.log("Found iframes. Video might be inside one:", iframes);
            }
        }
    }

    // Guesser Logic
    class Guesser {
        constructor() {
            this.active = false;
            this.interval = null;
            this.combinations = [];
            this.currentComboIndex = 0;
            this.busy = false;
            this.lastQuestionId = null;
            this.currentLabels = [];
            this.lastAttemptedCombo = null;
            this.lastQuestionKey = null;
            this.awaitingRetakeConfirm = false;

            // Check persistence on load
            if (localStorage.getItem('pp_yeeter_active') === 'true') {
                console.log("Restoring active state from persistence...");
                // Delay slightly to ensure DOM is ready
                setTimeout(() => this.start(), 1000);
            }
        }

        start() {
            if (this.active) return;
            this.active = true;
            localStorage.setItem('pp_yeeter_active', 'true'); // Persist

            this.currentComboIndex = 0;
            this.combinations = [];
            this.currentLabels = [];
            this.awaitingRetakeConfirm = false;
            this.interval = setInterval(() => this.tick(), 250);
            console.log("Playposit Guesser started");

            // Force create button if missing (e.g. on start screen)
            if (!document.getElementById('solve-btn')) {
                createSolveButton();
            }

            const btn = document.getElementById('solve-btn');
            if (btn) {
                btn.textContent = 'Waiting for question';
                btn.classList.add('active');
            }
        }

        stop() {
            this.active = false;
            localStorage.setItem('pp_yeeter_active', 'false'); // Clear persistence

            if (this.interval) clearInterval(this.interval);
            this.interval = null;
            this.busy = false;
            this.awaitingRetakeConfirm = false;
            console.log("Playposit Guesser stopped");
            const btn = document.getElementById('solve-btn');
            if (btn) {
                btn.textContent = 'Solve';
                btn.classList.remove('active');
            }
        }

        async tick() {
            if (this.busy) return;

            // Priority 0: Handle "Retake" or End Screen
            // Skip if we already clicked Retake and are waiting for the confirm dialog
            const retakeBtn = this.findButtonByText(['Retake', 'Retake Bulb', 'Reset']);
            if (retakeBtn && this.isVisible(retakeBtn) && !this.awaitingRetakeConfirm) {
                // Check for 100% score before retaking
                const bodyText = document.body.innerText;
                if (bodyText.includes('100%') || bodyText.includes('Score: 100') || bodyText.includes('100 / 100') || bodyText.includes('100/100')) {
                    console.log("Score is 100%, skipping Retake.");
                    this.stop(); // Stop the guesser as we are done
                    return;
                }

                console.log("Found Retake button. Clicking to restart...");
                retakeBtn.click();
                this.awaitingRetakeConfirm = true;
                this.busy = true;
                setTimeout(() => { this.busy = false; }, 1000);
                return;
            }

            // Priority 0.5: Handle Confirmation Dialog (for Retake)
            const confirmTexts = ['Confirm', 'Yes, retake'];
            if (this.awaitingRetakeConfirm) confirmTexts.push('Start');
            const confirmBtn = this.findButtonByText(confirmTexts);
            if (confirmBtn && this.isVisible(confirmBtn)) {
                console.log("Found Confirm/Start button (likely retake confirm). Clicking...");
                confirmBtn.click();
                this.awaitingRetakeConfirm = false;

                // Wait for reload/reset - REFINED LOGIC WITH POLLING
                this.busy = true;

                // Poll for video state for up to 20 seconds
                let checks = 0;
                const maxChecks = 40; // 20s

                const checkVideoInterval = setInterval(() => {
                    checks++;

                    // 1. Force re-check of DOM structure (This handles finding the "Start" button too)
                    checkForVideoAndExtras();

                    const video = document.querySelector('video');

                    if (video) {
                        // Attempt to play
                        if (video.paused) {
                            video.play().catch(e => { /* ignore */ });
                        }

                        if (!video.paused && video.currentTime > 0) {
                            console.log("Video confirmed playing. Resuming FastStep.");
                            clearInterval(checkVideoInterval);
                            this.busy = false;
                            startFastStepLoop();
                            updateFastStepButton(true);
                            return;
                        }
                    }

                    if (checks >= maxChecks) {
                        console.log("Timed out waiting for video to auto-start. Taking off busy lock.");
                        clearInterval(checkVideoInterval);
                        this.busy = false;
                    }
                }, 500);

                return;
            }

            // Priority 1: Retry
            const retryBtn = this.findButtonByText(['Retry', 'Try Again']);
            if (retryBtn && this.isVisible(retryBtn)) {
                console.log("Found Retry button. Clicking...", retryBtn);

                // Check for revealed correct answer BEFORE clicking Retry
                const feedback = this.detectFeedback();

                // Determine question key from pending or memory
                const pending = this.loadPendingAttempt();
                const qKey = (pending && pending.key) || this.lastQuestionKey;
                const qCombo = (pending && pending.combo) || this.lastAttemptedCombo;

                // Save wrong answer
                if (qKey && qCombo) {
                    console.log("Marking answer as wrong:", qKey, qCombo);
                    this.saveWrongAnswer(qKey, qCombo);
                }
                if (pending) this.clearPendingAttempt();

                // If the correct answer was revealed, save it for instant replay!
                if (feedback.revealedAnswer && qKey) {
                    console.log("Correct answer REVEALED during retry!", feedback.revealedAnswer);
                    this.saveAnswer(qKey, feedback.revealedAnswer);
                }

                retryBtn.click();
                this.busy = true;
                setTimeout(() => { this.busy = false; }, 500);
                return;
            }

            // Priority 2: Submit
            const submitBtn = this.findButtonByText(['Submit']);
            if (submitBtn && this.isVisible(submitBtn)) {
                // Update text to indicate action
                const btn = document.getElementById('solve-btn');
                if (btn) btn.textContent = 'Solving...';

                const inputs = this.getInputs();
                if (inputs.length === 0) {
                    console.log("Submit visible but no inputs found. Skipping.");
                    return;
                }

                // Extract labels (use spread to avoid mutating with sort)
                const inputLabels = inputs.map(i => this.getInputLabel(i));
                const labelsKey = [...inputLabels].sort().join('|');

                // Check for SAVED correct answer first
                const savedAnswer = this.loadAnswer(labelsKey);
                if (savedAnswer) {
                    console.log("Found saved correct answer!", savedAnswer);
                    this.busy = true;
                    await this.applyCombination(inputs, savedAnswer);

                    // Track before clicking
                    this.lastAttemptedCombo = savedAnswer;
                    this.lastQuestionKey = labelsKey;

                    if (submitBtn && !submitBtn.disabled) {
                        submitBtn.click();
                    }
                    setTimeout(() => { this.busy = false; }, 500);
                    return;
                }

                // Normal Combinatorial Logic
                const currentKey = [...this.currentLabels].sort().join('|');

                if (this.combinations.length === 0 || labelsKey !== currentKey) {
                    console.log("New question detected (or first run). Generating combinations.");
                    this.currentLabels = inputLabels;
                    this.generateCombinations(inputs, inputLabels);

                    // FILTER WRONG ANSWERS
                    const wrongAnswers = this.loadWrongAnswers(labelsKey);
                    if (wrongAnswers.length > 0) {
                        const originalCount = this.combinations.length;
                        this.combinations = this.combinations.filter(combo => {
                            const jsonCombo = JSON.stringify([...combo].sort());
                            return !wrongAnswers.some(wa => JSON.stringify([...wa].sort()) === jsonCombo);
                        });
                        console.log(`Filtered out ${originalCount - this.combinations.length} wrong combinations.`);
                    }

                    console.log(`Generated ${this.combinations.length} valid combos.`);
                    this.currentComboIndex = 0;
                }

                if (this.currentComboIndex >= this.combinations.length) {
                    console.log("Exhausted all combinations. Stopping.");
                    this.stop();
                    return;
                }

                this.busy = true;
                const comboLabels = this.combinations[this.currentComboIndex];
                console.log(`Applying combo ${this.currentComboIndex + 1}/${this.combinations.length}:`, comboLabels);

                await this.applyCombination(inputs, comboLabels);

                // Track attempt for saving later (Persist!)
                this.lastAttemptedCombo = comboLabels;
                this.lastQuestionKey = labelsKey;
                this.savePendingAttempt(labelsKey, comboLabels);

                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.click();
                    this.currentComboIndex++;
                }

                setTimeout(() => {
                    this.busy = false;
                }, 500);
                return;
            }

            // Priority 3: Continue (Only if no Retry and no Submit)
            const continueBtn = this.findButtonByText(['Continue', 'Next']);
            if (continueBtn && this.isVisible(continueBtn)) {
                console.log("Found Continue/Next button.", continueBtn);

                // Detect feedback to determine if answer was actually correct
                const feedback = this.detectFeedback();

                const pending = this.loadPendingAttempt();
                const qKey = (pending && pending.key) || this.lastQuestionKey;
                const qCombo = (pending && pending.combo) || this.lastAttemptedCombo;

                if (feedback.isCorrect === false) {
                    // Answer was WRONG but question is moving on (exhausted attempts)
                    console.log("Continue found but answer was INCORRECT.");
                    if (qKey && qCombo) {
                        this.saveWrongAnswer(qKey, qCombo);
                    }
                    // If the correct answer was revealed, save it for retakes!
                    if (feedback.revealedAnswer && qKey) {
                        console.log("Correct answer REVEALED on continue!", feedback.revealedAnswer);
                        this.saveAnswer(qKey, feedback.revealedAnswer);
                    }
                } else {
                    // Answer was CORRECT (or no negative feedback detected)
                    if (qKey && qCombo) {
                        console.log("Continue found! Marking answer as CORRECT:", qKey);
                        this.saveAnswer(qKey, qCombo);
                    }
                }

                if (pending) this.clearPendingAttempt();
                this.lastQuestionKey = null;
                this.lastAttemptedCombo = null;

                continueBtn.click();

                // Resume FastStep!
                console.log("Question done, attempting to resume FastStep...");
                const video = document.querySelector('video');
                if (video) {
                    if (video.paused) {
                        video.play().catch(e => console.log("Auto-resume play failed", e));
                    }
                    currentVideo = video;
                    startFastStepLoop();
                    updateFastStepButton(true);
                }

                // Reset state for next question
                this.combinations = [];
                this.currentComboIndex = 0;
                this.currentLabels = [];
                this.busy = true;

                // Reset text
                const btn = document.getElementById('solve-btn');
                if (btn) btn.textContent = 'Waiting for question';

                setTimeout(() => { this.busy = false; }, 500);
                return;
            }

            // If nothing found, ensure text is correct
            const btn = document.getElementById('solve-btn');
            if (btn && this.active && btn.textContent !== 'Waiting for question') {
                btn.textContent = 'Waiting for question';
            }
        }

        // --- Feedback Detection ---

        /**
         * Scans the page for feedback after a submission.
         * Returns { isCorrect: bool|null, revealedAnswer: string[]|null }
         */
        detectFeedback() {
            const result = { isCorrect: null, revealedAnswer: null };

            // 1. Check text-based feedback from targeted elements first
            const feedbackSelectors = [
                '.pp-feedback', '.feedback', '.v-alert', '.v-snack',
                '[class*="feedback"]', '[class*="result"]',
                '.v-card__text', '.v-dialog'
            ];

            let feedbackText = '';
            for (const sel of feedbackSelectors) {
                try {
                    const els = document.querySelectorAll(sel);
                    els.forEach(el => {
                        if (this.isVisible(el)) {
                            feedbackText += ' ' + (el.innerText || '').toLowerCase();
                        }
                    });
                } catch (e) { /* invalid selector, skip */ }
            }

            // Fall back to broader page text if no specific feedback area found
            if (!feedbackText.trim()) {
                feedbackText = (document.body.innerText || '').toLowerCase();
            }

            // Negative indicators (check first — more important)
            const incorrectPatterns = [
                'incorrect', 'not correct', 'that\'s not right', 'not right',
                'wrong answer', 'not quite', 'try again', 'that is not correct'
            ];
            // Positive indicators
            const correctPatterns = [
                'correct!', 'that\'s correct', 'that is correct',
                'you got it', 'well done', 'great job', 'nice work', 'good job'
            ];

            for (const pat of incorrectPatterns) {
                if (feedbackText.includes(pat)) {
                    result.isCorrect = false;
                    console.log(`[Feedback] Detected INCORRECT via text: "${pat}"`);
                    break;
                }
            }

            if (result.isCorrect === null) {
                for (const pat of correctPatterns) {
                    if (feedbackText.includes(pat)) {
                        result.isCorrect = true;
                        console.log(`[Feedback] Detected CORRECT via text: "${pat}"`);
                        break;
                    }
                }
            }

            // 2. Try to extract revealed correct answer from visual cues
            result.revealedAnswer = this.extractRevealedAnswer();

            // If a revealed answer is found, it means the system is showing
            // which answer is correct — this typically happens when you're WRONG
            if (result.revealedAnswer && result.isCorrect === null) {
                console.log("[Feedback] Found revealed answer => inferring INCORRECT");
                result.isCorrect = false;
            }

            console.log("[Feedback] Final result:", result);
            return result;
        }

        /**
         * Scans answer options for visual indicators of the correct answer
         * (green highlights, check icons, .correct CSS classes, etc.)
         */
        extractRevealedAnswer() {
            const inputs = this.getInputs();
            if (inputs.length === 0) return null;

            const correctLabels = [];

            for (const input of inputs) {
                const container = input.closest('.v-radio, .v-checkbox') || input.parentElement;
                if (!container) continue;

                let isMarkedCorrect = false;

                // Walk up ancestors looking for "correct" CSS class
                let el = container;
                for (let i = 0; i < 4 && el && el !== document.body; i++) {
                    const classStr = (typeof el.className === 'string') ? el.className : (el.className?.toString?.() || '');
                    if (/\bcorrect\b/i.test(classStr) ||
                        /\bsuccess\b/i.test(classStr) ||
                        /\bis-correct\b/i.test(classStr) ||
                        /\bpp-correct\b/i.test(classStr)) {
                        isMarkedCorrect = true;
                        break;
                    }
                    el = el.parentElement;
                }

                // Check for checkmark icons inside the option container
                if (!isMarkedCorrect) {
                    const icons = container.querySelectorAll('i, .v-icon, svg, span[class*="icon"]');
                    for (const icon of icons) {
                        const text = (icon.innerText || icon.textContent || '').trim().toLowerCase();
                        const cls = (typeof icon.className === 'string') ? icon.className : '';
                        if (text === 'check' || text === 'check_circle' || text === 'done' ||
                            cls.includes('mdi-check') || cls.includes('fa-check')) {
                            isMarkedCorrect = true;
                            break;
                        }
                    }
                }

                // Check for green color on the container or label
                if (!isMarkedCorrect) {
                    try {
                        const targets = [container];
                        const label = container.querySelector('label');
                        if (label) targets.push(label);

                        for (const target of targets) {
                            const style = getComputedStyle(target);
                            const color = style.color;
                            const bg = style.backgroundColor;
                            const border = style.borderColor;
                            // Material green variants: #4CAF50 (76,175,80), #43A047 (67,160,71), #388E3C (56,142,60)
                            const greenPatterns = ['76, 175, 80', '67, 160, 71', '56, 142, 60', '0, 128, 0', '46, 125, 50'];
                            for (const gp of greenPatterns) {
                                if (color.includes(gp) || bg.includes(gp) || border.includes(gp)) {
                                    isMarkedCorrect = true;
                                    break;
                                }
                            }
                            if (isMarkedCorrect) break;
                        }
                    } catch (e) { /* getComputedStyle can fail on detached elements */ }
                }

                if (isMarkedCorrect) {
                    correctLabels.push(this.getInputLabel(input));
                }
            }

            if (correctLabels.length > 0) {
                console.log("[RevealedAnswer] Found correct labels:", correctLabels);
                return correctLabels;
            }
            return null;
        }

        // --- Input Helpers ---

        getInputs() {
            const allInputs = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
            return allInputs.filter(el => this.isVisible(el) || this.isVisible(el.parentElement));
        }

        getInputLabel(input) {
            let parent = input.closest('.v-radio, .v-checkbox');
            if (parent) {
                const label = parent.querySelector('label');
                if (label) return label.innerText.trim();
            }

            if (input.parentElement.tagName === 'LABEL') {
                return input.parentElement.innerText.trim();
            }

            if (input.id) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) return label.innerText.trim();
            }

            return input.value || "unknown";
        }

        generateCombinations(inputs, labels) {
            const type = inputs[0].type;
            this.combinations = [];

            if (type === 'radio') {
                for (let i = 0; i < labels.length; i++) {
                    this.combinations.push([labels[i]]);
                }
            } else {
                const count = labels.length;
                const max = 1 << count;
                for (let i = 1; i < max; i++) {
                    const combo = [];
                    for (let j = 0; j < count; j++) {
                        if ((i >> j) & 1) {
                            combo.push(labels[j]);
                        }
                    }
                    this.combinations.push(combo);
                }
                this.combinations.sort((a, b) => a.length - b.length);
            }
        }

        async applyCombination(inputs, targetLabels) {
            const currentInputMap = inputs.map(input => ({
                el: input,
                label: this.getInputLabel(input)
            }));

            for (let item of currentInputMap) {
                const shouldBeChecked = targetLabels.includes(item.label);
                const input = item.el;

                const clickTarget = input.parentElement.querySelector('.v-input--selection-controls__ripple') || input.parentElement || input;

                if (input.checked !== shouldBeChecked) {
                    if (input.type === 'radio') {
                        if (shouldBeChecked) clickTarget.click();
                    } else {
                        clickTarget.click();
                    }
                    await new Promise(r => setTimeout(r, 50));
                }
            }
        }

        findButtonByText(texts) {
            const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
            return buttons.find(btn => {
                if (!this.isVisible(btn)) return false;
                const t = btn.innerText || btn.textContent;
                return texts.some(text => t.toLowerCase().includes(text.toLowerCase()));
            });
        }

        isVisible(el) {
            if (!el) return false;
            return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        }

        // Persistence Helpers
        saveAnswer(key, answer) {
            this._saveLocal('pp_yeeter_answers', key, answer);
        }

        loadAnswer(key) {
            return this._loadLocal('pp_yeeter_answers', key);
        }

        saveWrongAnswer(key, answer) {
            try {
                const storageKey = 'pp_yeeter_wrong_answers';
                const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
                if (!data[key]) data[key] = [];

                const jsonAnswer = JSON.stringify([...answer].sort());
                if (!data[key].some(a => JSON.stringify([...a].sort()) === jsonAnswer)) {
                    data[key].push(answer);
                }
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) { console.error(e); }
        }

        loadWrongAnswers(key) {
            return this._loadLocal('pp_yeeter_wrong_answers', key) || [];
        }

        _saveLocal(storageKey, key, value) {
            try {
                const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
                data[key] = value;
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e) { }
        }

        _loadLocal(storageKey, key) {
            try {
                const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
                return data[key];
            } catch (e) { return null; }
        }

        savePendingAttempt(key, combo) {
            this._saveLocal('pp_yeeter_pending', 'latest', { key, combo });
        }

        loadPendingAttempt() {
            return this._loadLocal('pp_yeeter_pending', 'latest');
        }

        clearPendingAttempt() {
            localStorage.removeItem('pp_yeeter_pending');
        }
    }

    const guesser = new Guesser();

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
        console.log("Playposit Yeeter initializing...");
        startObserver();
        checkForVideoAndExtras();

        // Safety check: if persisted active, ensure start
        setTimeout(() => {
            if (localStorage.getItem('pp_yeeter_active') === 'true' && !guesser.active) {
                console.log("Auto-starting Guesser due to persisted state.");
                guesser.start();
            }
        }, 1500);
    }

    // Expose methods for re-injection
    window.playpositYeeter = {
        checkForVideoAndExtras,
        createFastStepButton,
        createSolveButton,
        toggleFastStep
    };

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
