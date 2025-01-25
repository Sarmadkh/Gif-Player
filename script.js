const DEFAULT_VALUES = {
    speed: 1, rotation: 0, scale: 100, playDirection: 'forward', isBouncing: false, isPlaying: true, baseSpeed: 50,
    effects: { grayscale: false, invert: false, mirror: false, pixelate: false, censor: false, blur: false },
    pixelatedRegions: [], censoredRegions: [], blurredRegions: []
};

const state = { frames: [], isHovering: false, autoPlayInterval: null, currentFrame: 0, effects: { ...DEFAULT_VALUES.effects }, pixelatedRegions: [], censoredRegions: [], blurredRegions: [], ...DEFAULT_VALUES };

const getElement = (id) => document.getElementById(id);
const updateElement = (id, value) => getElement(id).textContent = value;
const updateSlider = (id, value) => getElement(id).value = value;

// Update UI elements
const updateUI = {
    transform: () => {
        const canvas = getElement('gifCanvas');
        canvas.style.transform = `rotate(${getElement('rotateSlider').value}deg) scale(${getElement('scaleSlider').value / 100 * (state.effects.mirror ? -1 : 1)}, ${getElement('scaleSlider').value / 100})`;
        canvas.style.filter = `grayscale(${state.effects.grayscale ? 1 : 0}) invert(${state.effects.invert ? 1 : 0})`;
    },
    playbackButtons: () => {
        ['playForwardButton', 'playBackwardButton', 'bounceButton'].forEach(id => getElement(id).classList.toggle('active',
            (id === 'playForwardButton' && state.playDirection === 'forward' && !state.isBouncing) ||
            (id === 'playBackwardButton' && state.playDirection === 'backward') ||
            (id === 'bounceButton' && state.isBouncing)
        ));
    },
    effectButtons: () => ['grayscale', 'invert', 'mirror'].forEach(effect => getElement(`${effect}Button`).classList.toggle('active', state.effects[effect])),
    playPause: () => getElement('playPauseButton').textContent = state.isPlaying ? '⏸' : '▶️',
    frameCounter: () => updateElement('frameCounter', `Frame: ${state.currentFrame + 1}/${state.frames.length}`)
};

// Load GIF from URL and decode frames
async function loadGif(url, canvas) {
    const spinner = getElement('loadingSpinner');
    spinner.style.display = 'block'; // Show spinner

    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const gif = new GifReader(new Uint8Array(buffer));
        canvas.width = gif.width; canvas.height = gif.height;
        const pixelBuffer = new Uint8Array(gif.width * gif.height * 4);
        const frames = Array.from({ length: gif.numFrames() }, (_, i) => {
            gif.decodeAndBlitFrameRGBA(i, pixelBuffer);
            return new ImageData(new Uint8ClampedArray(pixelBuffer), gif.width, gif.height);
        });

        spinner.style.display = 'none'; // Hide spinner
        return frames;
    } catch (error) {
        spinner.style.display = 'none'; // Hide spinner on error
        console.error('Error loading GIF:', error);
        throw error;
    }
}

// Draw the current frame with applied effects
function drawFrame(frameNumber) {
    if (!state.frames.length) return;
    const ctx = getElement('gifCanvas').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.putImageData(state.frames[frameNumber], 0, 0);

    // Apply effects to regions
    state.pixelatedRegions.forEach(region => pixelateRegion(ctx, region, 10));
    state.censoredRegions.forEach(region => censorRegion(ctx, region));
    state.blurredRegions.forEach(region => blurRegion(ctx, region, 5));
}

// Pixelate a region
function pixelateRegion(ctx, region, pixelSize) {
    const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
    const data = imageData.data;

    for (let i = 0; i < region.height; i += pixelSize) {
        for (let j = 0; j < region.width; j += pixelSize) {
            const red = data[(i * region.width + j) * 4];
            const green = data[(i * region.width + j) * 4 + 1];
            const blue = data[(i * region.width + j) * 4 + 2];

            for (let k = 0; k < pixelSize; k++) {
                for (let l = 0; l < pixelSize; l++) {
                    if (i + k < region.height && j + l < region.width) {
                        const index = ((i + k) * region.width + (j + l)) * 4;
                        data[index] = red;
                        data[index + 1] = green;
                        data[index + 2] = blue;
                    }
                }
            }
        }
    }

    ctx.putImageData(imageData, region.x, region.y);
}

// Censor a region with a black bar
function censorRegion(ctx, region) {
    ctx.fillStyle = 'black';
    ctx.fillRect(region.x, region.y, region.width, region.height);
}

// Blur a region
function blurRegion(ctx, region, radius) {
    const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
    const data = imageData.data;

    for (let y = 0; y < region.height; y++) {
        for (let x = 0; x < region.width; x++) {
            let totalRed = 0, totalGreen = 0, totalBlue = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < region.width && ny >= 0 && ny < region.height) {
                        const index = (ny * region.width + nx) * 4;
                        totalRed += data[index];
                        totalGreen += data[index + 1];
                        totalBlue += data[index + 2];
                        count++;
                    }
                }
            }

            const index = (y * region.width + x) * 4;
            data[index] = totalRed / count;
            data[index + 1] = totalGreen / count;
            data[index + 2] = totalBlue / count;
        }
    }

    ctx.putImageData(imageData, region.x, region.y);
}

// Playback controls
const playbackControls = {
    start: () => {
        if (state.autoPlayInterval) return;
        state.autoPlayInterval = setInterval(() => {
            if (!state.frames.length) return;
            if (state.isBouncing && (state.currentFrame === 0 || state.currentFrame === state.frames.length - 1)) state.playDirection = state.playDirection === 'forward' ? 'backward' : 'forward';
            state.currentFrame = (state.currentFrame + (state.playDirection === 'forward' ? 1 : -1) + state.frames.length) % state.frames.length;
            drawFrame(state.currentFrame);
            updateUI.frameCounter();
        }, state.baseSpeed / state.speed);
    },
    stop: () => { clearInterval(state.autoPlayInterval); state.autoPlayInterval = null; },
    toggle: () => { state.isPlaying = !state.isPlaying; updateUI.playPause(); state.isPlaying ? playbackControls.start() : playbackControls.stop(); },
    next: () => { if (!state.frames.length) return; state.currentFrame = (state.currentFrame + 1) % state.frames.length; drawFrame(state.currentFrame); updateUI.frameCounter(); },
    prev: () => { if (!state.frames.length) return; state.currentFrame = (state.currentFrame - 1 + state.frames.length) % state.frames.length; drawFrame(state.currentFrame); updateUI.frameCounter(); }
};

// Reset all settings and effects
function resetAll() {
    Object.assign(state, { ...DEFAULT_VALUES, frames: state.frames, currentFrame: state.currentFrame, autoPlayInterval: state.autoPlayInterval, effects: { ...DEFAULT_VALUES.effects }, pixelatedRegions: [], censoredRegions: [], blurredRegions: [] });
    ['speed', 'rotate', 'scale'].forEach(type => updateSlider(`${type}Slider`, state[type]) && updateElement(`${type}Value`, `${state[type]}${type === 'speed' ? 'x' : type === 'scale' ? '%' : '°'}`));
    updateUI.transform(); updateUI.playbackButtons(); updateUI.effectButtons(); updateUI.playPause(); updateUI.frameCounter();
    playbackControls.stop(); if (state.isPlaying) playbackControls.start();
    drawFrame(state.currentFrame); // Redraw frame to clear effects
}

// Region selection logic
let isDrawing = false;
let startX, startY;
let currentEffect = null; // Tracks the current effect (pixelate, censor, blur)

getElement('pixelateButton').addEventListener('click', () => {
    currentEffect = 'pixelate';
    startRegionSelection();
});

getElement('censorButton').addEventListener('click', () => {
    currentEffect = 'censor';
    startRegionSelection();
});

getElement('blurButton').addEventListener('click', () => {
    currentEffect = 'blur';
    startRegionSelection();
});

function startRegionSelection() {
    const canvas = getElement('gifCanvas');
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawRectangle);
    canvas.addEventListener('mouseup', endDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const canvas = getElement('gifCanvas');
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
}

function drawRectangle(e) {
    if (!isDrawing) return;
    const canvas = getElement('gifCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(state.frames[state.currentFrame], 0, 0);

    // Draw the rectangle
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
}

function endDrawing(e) {
    isDrawing = false;
    const canvas = getElement('gifCanvas');
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const width = endX - startX;
    const height = endY - startY;

    if (width > 0 && height > 0) {
        const region = { x: startX, y: startY, width, height };
        if (currentEffect === 'pixelate') state.pixelatedRegions.push(region);
        else if (currentEffect === 'censor') state.censoredRegions.push(region);
        else if (currentEffect === 'blur') state.blurredRegions.push(region);
        drawFrame(state.currentFrame);
    }

    canvas.style.cursor = 'e-resize';
    canvas.removeEventListener('mousedown', startDrawing);
    canvas.removeEventListener('mousemove', drawRectangle);
    canvas.removeEventListener('mouseup', endDrawing);
}

// Initialize app
window.onload = async function () {
    const canvas = getElement('gifCanvas');
    canvas.addEventListener('mouseenter', () => { state.isHovering = true; if (state.isPlaying) playbackControls.stop(); });
    canvas.addEventListener('mouseleave', () => { state.isHovering = false; if (state.isPlaying) playbackControls.start(); });
    canvas.addEventListener('mousemove', (e) => {
        if (!state.isHovering || !state.frames.length) return;
        const rect = canvas.getBoundingClientRect();
        state.currentFrame = Math.floor(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (state.frames.length - 1));
        drawFrame(state.currentFrame); updateUI.frameCounter();
    });

    // Read GIF URL from the address bar's hash fragment
    const hash = window.location.hash.substring(1);
    if (hash) {
        getElement('gifUrlInput').value = hash;
        loadGif(hash, getElement('gifCanvas'))
            .then(frames => {
                state.frames = frames;
                state.currentFrame = 0;
                drawFrame(state.currentFrame);
                updateUI.frameCounter();
                if (state.isPlaying) playbackControls.start();
            })
            .catch(console.error);
    }

    getElement('gifUrlInput').addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url) {
            loadGif(url, getElement('gifCanvas'))
                .then(frames => {
                    state.frames = frames;
                    state.currentFrame = 0;
                    drawFrame(state.currentFrame);
                    updateUI.frameCounter();
                    if (state.isPlaying) playbackControls.start();
                })
                .catch(console.error);
        }
    });

    ['rotate', 'scale', 'speed'].forEach(type => getElement(`${type}Slider`).addEventListener('input', (e) => {
        const value = e.target.value;
        if (type === 'speed') { state.speed = parseFloat(value); updateElement('speedValue', `${value}x`); if (state.isPlaying) { playbackControls.stop(); playbackControls.start(); } }
        else { updateElement(`${type}Value`, `${value}${type === 'scale' ? '%' : '°'}`); updateUI.transform(); }
    }));

    const buttonHandlers = {
        playForwardButton: () => { state.playDirection = 'forward'; state.isBouncing = false; if (!state.isPlaying) { state.isPlaying = true; playbackControls.start(); } updateUI.playbackButtons(); },
        playBackwardButton: () => { state.playDirection = 'backward'; state.isBouncing = false; if (!state.isPlaying) { state.isPlaying = true; playbackControls.start(); } updateUI.playbackButtons(); },
        bounceButton: () => { state.playDirection = 'forward'; state.isBouncing = true; if (!state.isPlaying) { state.isPlaying = true; playbackControls.start(); } updateUI.playbackButtons(); },
        playPauseButton: playbackControls.toggle, nextFrameButton: playbackControls.next, prevFrameButton: playbackControls.prev, resetButton: resetAll,
        grayscaleButton: () => { state.effects.grayscale = !state.effects.grayscale; updateUI.transform(); updateUI.effectButtons(); },
        invertButton: () => { state.effects.invert = !state.effects.invert; updateUI.transform(); updateUI.effectButtons(); },
        mirrorButton: () => { state.effects.mirror = !state.effects.mirror; updateUI.transform(); updateUI.effectButtons(); }
    };

    Object.entries(buttonHandlers).forEach(([id, handler]) => getElement(id).addEventListener('click', handler));

    resetAll();
};
