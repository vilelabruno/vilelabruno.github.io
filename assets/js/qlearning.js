(function () {
    var canvas = document.getElementById('qlearningCanvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var statsEl = document.getElementById('qlearningStats');

    var ROWS = 6, COLS = 6;
    var WALLS = [[0, 2], [1, 2], [2, 2], [3, 4], [4, 0], [4, 1], [4, 2], [4, 4]];
    var START = [0, 0];
    var GOAL = [5, 5];
    var ACTIONS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // up, right, down, left

    var wallSet = {};
    WALLS.forEach(function (w) { wallSet[w[0] + ',' + w[1]] = true; });
    function isWall(r, c) { return !!wallSet[r + ',' + c]; }
    function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
    function stateIdx(r, c) { return r * COLS + c; }

    var ALPHA = 0.5, GAMMA = 0.92;
    var EPS_MIN = 0.08, EPS_DECAY = 0.88;
    var MAX_STEPS = 60, RESET_EVERY = 60;
    var Q_MIN = -0.2, Q_MAX = 0.95;

    var Q, epsilon, episode, stepsInEpisode, minSteps, agent, prevAgent;

    function resetTraining() {
        Q = [];
        for (var i = 0; i < ROWS * COLS; i++) Q.push([0, 0, 0, 0]);
        epsilon = 1;
        episode = 0;
        stepsInEpisode = 0;
        minSteps = Infinity;
        agent = START.slice();
        prevAgent = START.slice();
    }
    resetTraining();

    function argmaxIndex(qs) {
        var best = 0;
        for (var i = 1; i < qs.length; i++) if (qs[i] > qs[best]) best = i;
        return best;
    }

    function argmaxRandomTie(qs) {
        var best = argmaxIndex(qs);
        var ties = [];
        for (var j = 0; j < qs.length; j++) if (qs[j] === qs[best]) ties.push(j);
        return ties[Math.floor(Math.random() * ties.length)];
    }

    function chooseAction(r, c) {
        if (Math.random() < epsilon) return Math.floor(Math.random() * ACTIONS.length);
        return argmaxRandomTie(Q[stateIdx(r, c)]);
    }

    function step() {
        var r = agent[0], c = agent[1];
        var a = chooseAction(r, c);
        var nr = r + ACTIONS[a][0], nc = c + ACTIONS[a][1];
        var blocked = !inBounds(nr, nc) || isWall(nr, nc);
        if (blocked) { nr = r; nc = c; }

        var reachedGoal = nr === GOAL[0] && nc === GOAL[1];
        var reward = reachedGoal ? 1 : (blocked ? -0.05 : -0.02);

        var s = stateIdx(r, c), ns = stateIdx(nr, nc);
        var maxNext = Math.max.apply(null, Q[ns]);
        Q[s][a] += ALPHA * (reward + GAMMA * maxNext - Q[s][a]);

        prevAgent = [r, c];
        agent = [nr, nc];
        stepsInEpisode++;

        var done = reachedGoal || stepsInEpisode >= MAX_STEPS;
        if (done) {
            if (reachedGoal && stepsInEpisode < minSteps) minSteps = stepsInEpisode;
            episode++;
            stepsInEpisode = 0;
            epsilon = Math.max(EPS_MIN, epsilon * EPS_DECAY);
            agent = START.slice();
            prevAgent = START.slice();
            if (episode % RESET_EVERY === 0) resetTraining();
        }
        updateStats();
    }

    function updateStats() {
        if (!statsEl) return;
        var best = minSteps === Infinity ? '—' : minSteps + ' steps';
        statsEl.textContent = 'Episode ' + episode + ' · ε = ' + epsilon.toFixed(2) + ' · best path: ' + best;
    }
    updateStats();

    // --- rendering ---
    var size = 240, cellSlot = size / COLS, gap = 3, radius = 8;

    function roundRect(x, y, w, h, rad) {
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + w, y, x + w, y + h, rad);
        ctx.arcTo(x + w, y + h, x, y + h, rad);
        ctx.arcTo(x, y + h, x, y, rad);
        ctx.arcTo(x, y, x + w, y, rad);
        ctx.closePath();
    }

    function getColors() {
        var cs = getComputedStyle(document.documentElement);
        return {
            surfaceAlt: cs.getPropertyValue('--surface-alt').trim(),
            text: cs.getPropertyValue('--text').trim(),
            muted: cs.getPropertyValue('--muted').trim(),
            accent: cs.getPropertyValue('--accent').trim(),
            accentStrong: cs.getPropertyValue('--accent-strong').trim()
        };
    }
    var colors = getColors();
    if ('MutationObserver' in window) {
        new MutationObserver(function () { colors = getColors(); })
            .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    function normQ(q) {
        return Math.max(0, Math.min(1, (q - Q_MIN) / (Q_MAX - Q_MIN)));
    }

    function drawArrow(cx, cy, actionIdx, alpha) {
        var s = cellSlot * 0.16;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(actionIdx * Math.PI / 2);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colors.text;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.8, s * 0.7);
        ctx.lineTo(-s * 0.8, s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function draw(t) {
        ctx.clearRect(0, 0, size, size);
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                var x = c * cellSlot + gap / 2, y = r * cellSlot + gap / 2;
                var w = cellSlot - gap, h = cellSlot - gap;
                roundRect(x, y, w, h, radius);
                if (isWall(r, c)) {
                    ctx.fillStyle = colors.muted;
                    ctx.globalAlpha = 0.28;
                    ctx.fill();
                } else if (r === GOAL[0] && c === GOAL[1]) {
                    ctx.fillStyle = colors.accentStrong;
                    ctx.globalAlpha = 0.9;
                    ctx.fill();
                } else {
                    ctx.fillStyle = colors.surfaceAlt;
                    ctx.globalAlpha = 1;
                    ctx.fill();
                    var qs = Q[stateIdx(r, c)];
                    var visited = qs[0] !== 0 || qs[1] !== 0 || qs[2] !== 0 || qs[3] !== 0;
                    if (visited) {
                        var maxQ = Math.max.apply(null, qs);
                        var heat = normQ(maxQ);
                        if (heat > 0.02) {
                            ctx.fillStyle = colors.accent;
                            ctx.globalAlpha = heat * 0.55;
                            ctx.fill();
                        }
                        drawArrow(x + w / 2, y + h / 2, argmaxIndex(qs), 0.5);
                    }
                }
                ctx.globalAlpha = 1;
            }
        }

        var ax = (prevAgent[1] + (agent[1] - prevAgent[1]) * t) * cellSlot + cellSlot / 2;
        var ay = (prevAgent[0] + (agent[0] - prevAgent[0]) * t) * cellSlot + cellSlot / 2;
        ctx.beginPath();
        ctx.fillStyle = colors.accentStrong;
        ctx.shadowColor = colors.accentStrong;
        ctx.shadowBlur = 10;
        ctx.arc(ax, ay, cellSlot * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function setupCanvas() {
        var container = canvas.parentElement;
        var cssSize = Math.round(container.getBoundingClientRect().width) || 240;
        size = cssSize;
        cellSlot = size / COLS;
        var dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var STEP_MS = reduceMotion ? 450 : 75;

    var running = false, stepTimer = null, rafId = null, lastStepTime = 0;

    function loop(now) {
        if (!running) return;
        var t = reduceMotion ? 1 : Math.min(1, (now - lastStepTime) / STEP_MS);
        draw(t);
        rafId = requestAnimationFrame(loop);
    }

    function start() {
        if (running) return;
        running = true;
        lastStepTime = performance.now();
        stepTimer = setInterval(function () {
            step();
            lastStepTime = performance.now();
        }, STEP_MS);
        rafId = requestAnimationFrame(loop);
    }

    function stop() {
        running = false;
        if (stepTimer) clearInterval(stepTimer);
        if (rafId) cancelAnimationFrame(rafId);
    }

    setupCanvas();
    draw(1);

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { setupCanvas(); draw(1); }, 150);
    });

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) start(); else stop();
            });
        }, { threshold: 0.1 });
        io.observe(canvas);
    } else {
        start();
    }
})();
