/* =========================================
   GOD-LEVEL LOGIC: PARALLAX & PHYSICS
   ========================================= */

const state = {
    startTs: 0,
    elapsed: 0,
    running: false,
    laps: [],
    lastLapTime: 0,
    rafId: null
};

// DOM Cache
const dom = {
    timeMin: document.getElementById('time-min'),
    timeSec: document.getElementById('time-sec'),
    msDisplay: document.getElementById('ms-display'),
    arcSeconds: document.getElementById('arc-seconds'),
    handRotator: document.getElementById('hand-rotator'),
    ringDeco1: document.getElementById('ring-deco-1'),
    ringDeco2: document.getElementById('ring-deco-2'),
    lapList: document.getElementById('lap-list'),
    body: document.body,
    interface: document.querySelector('.chronos-interface'),
    bgLayers: document.querySelectorAll('.bg-layer'),

    // Buttons
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnLap: document.getElementById('btn-lap'),
    btnClear: document.getElementById('btn-clear'),
    btnExport: document.getElementById('btn-export'),
    statusText: document.querySelector('.status-text')
};

// Start
init();

function init() {
    bindEvents();
    render(0);
    initParallax();
}

function bindEvents() {
    dom.btnStart.addEventListener('click', start);
    dom.btnPause.addEventListener('click', pause);
    dom.btnLap.addEventListener('click', lap);
    dom.btnClear.addEventListener('click', clear);
    dom.btnExport.addEventListener('click', exportData);
}

// ---------------------------------------------------------
// Logic
// ---------------------------------------------------------

function start() {
    if (state.running) return;
    state.startTs = performance.now() - state.elapsed;
    state.running = true;

    dom.body.classList.add('warp-active'); // Engage Warp Effect
    setStatus("WARP DRIVE ENGAGED");
    updateUIState();
    loop();
}

function pause() {
    state.running = false;
    cancelAnimationFrame(state.rafId);

    dom.body.classList.remove('warp-active');
    setStatus("SYSTEM IDLE");
    updateUIState();
}

function clear() {
    pause();
    state.startTs = 0;
    state.elapsed = 0;
    state.laps = [];
    state.lastLapTime = 0;

    dom.lapList.innerHTML = '';
    setStatus("READY FOR LAUNCH");
    render(0);
    updateUIState();
}

function lap() {
    if (!state.running && state.elapsed === 0) return;
    const currentTotal = state.elapsed;
    const delta = currentTotal - state.lastLapTime;
    state.lastLapTime = currentTotal;

    const lapData = { num: state.laps.length + 1, delta, total: currentTotal };
    state.laps.unshift(lapData);

    addLapToUI(lapData);
}

function exportData() {
    if (state.laps.length === 0) return;
    let csv = "Lap,Interval,Total\n";
    [...state.laps].reverse().forEach(l => {
        csv += `${l.num},${formatTime(l.delta).full},${formatTime(l.total).full}\n`;
    });

    const link = document.createElement("a");
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `chronos_flight_log_${Date.now()}.csv`;
    link.click();
}

// ---------------------------------------------------------
// Rendering
// ---------------------------------------------------------

function loop() {
    if (!state.running) return;
    state.elapsed = performance.now() - state.startTs;
    render(state.elapsed);
    state.rafId = requestAnimationFrame(loop);
}

function render(ms) {
    const fmt = formatTime(ms);

    // Update separated elements
    dom.timeMin.textContent = fmt.min;
    dom.timeSec.textContent = fmt.sec;
    dom.msDisplay.textContent = `.${fmt.ms}`;

    // Rotations
    const totalSec = ms / 1000;
    const degrees = (totalSec % 60) * 6;

    dom.handRotator.setAttribute('transform', `rotate(${degrees}, 200, 200)`);
    dom.ringDeco1.setAttribute('transform', `rotate(${totalSec * 10}, 200, 200)`); // Fast outer ring
    dom.ringDeco2.setAttribute('transform', `rotate(${-totalSec * 5}, 200, 200)`); // Counter rotation

    // SVG Arc
    drawArc(degrees);
}

function drawArc(degrees) {
    const r = 195;
    const cx = 200;
    const cy = 200;
    const startX = 200;
    const startY = 200 - r;

    // Reset visual arc every minute or keep filling? 
    // Let's standard reset.
    if (degrees <= 0) {
        dom.arcSeconds.setAttribute('d', '');
        return;
    }

    // Convert to rads (svg 0 is at 3 o'clock, we start at 12 o'clock so -90)
    const rad = (degrees - 90) * (Math.PI / 180);
    const endX = cx + r * Math.cos(rad);
    const endY = cy + r * Math.sin(rad);
    const largeArc = degrees > 180 ? 1 : 0;

    const d = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
    dom.arcSeconds.setAttribute('d', d);
}

// ---------------------------------------------------------
// Parallax / 3D Tilt
// ---------------------------------------------------------

function initParallax() {
    document.addEventListener('mousemove', (e) => {
        const { innerWidth, innerHeight } = window;
        const x = e.clientX;
        const y = e.clientY;

        // Calculate percentage from center (-1 to 1)
        const xPct = (x / innerWidth - 0.5) * 2;
        const yPct = (y / innerHeight - 0.5) * 2;

        // Tilt Interface (Stabilized)
        // RotateY is driven by X movement, RotateX is driven by Y movement (inverted)
        const tiltX = -yPct * 10; // Reduces excessive tilt
        const tiltY = xPct * 10;  // Reduces excessive tilt

        dom.interface.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

        // Parallax Background
        // Move opposite to mouse
        dom.bgLayers.forEach(layer => {
            const depth = 30; // Moderate depth
            const moveX = -xPct * depth;
            const moveY = -yPct * depth;
            layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function formatTime(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const cen = Math.floor((ms % 1000) / 10);
    return {
        min: pad(min),
        sec: pad(sec),
        ms: pad(cen),
        full: `${pad(min)}:${pad(sec)}.${pad(cen)}`
    };
}

function pad(n) { return n.toString().padStart(2, '0'); }

function setStatus(msg) { dom.statusText.textContent = msg; }

function updateUIState() {
    dom.btnStart.disabled = state.running;
    dom.btnPause.disabled = !state.running;
    dom.btnLap.disabled = (!state.running && state.elapsed === 0);
    dom.btnExport.disabled = state.laps.length === 0;
}

function addLapToUI(lap) {
    const div = document.createElement('div');
    div.className = 'lap-entry';
    div.innerHTML = `
        <span class="seq-num">LOG.${pad(lap.num)}</span>
        <span class="ts-delta">${formatTime(lap.delta).full}</span>
        <span class="ts-total">${formatTime(lap.total).full}</span>
    `;
    dom.lapList.prepend(div);
    dom.btnExport.disabled = false;
}
