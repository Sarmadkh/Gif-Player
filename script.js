const proxy = 'https://corsproxy.io/?'; //
const gifSrcInput = document.getElementById('gifSrc');
const speedInput = document.getElementById('speed');
const scaleInput = document.getElementById('scale');
const rotationInput = document.getElementById('rotation');
const bounceToggle = document.getElementById('bounceToggle');
const forwardButton = document.getElementById('forwardButton');
const backwardButton = document.getElementById('backwardButton');
const player = document.getElementById('player');
const resetButton = document.getElementById('resetButton');

const defaultSpeed = 1;
const defaultScale = 1;
const defaultRotation = 0;
const defaultBounce = false;

// Function to update the GIF source based on the URL hash
function updateGifSourceFromHash() {
	const hash = window.location.hash;
	if (hash) {
		const gifSrc = hash.substring(1); // Remove the '#' character
		const gifSrcInput = document.getElementById('gifSrc');
		const player = document.getElementById('player');

		// Update the input field and player source
		gifSrcInput.value = gifSrc;
		player.setAttribute('src', proxy + gifSrc);
	}
}

// Call the function when the page loads
window.addEventListener('load', updateGifSourceFromHash);

// Call the function when the hash changes (e.g., when the URL changes)
window.addEventListener('hashchange', updateGifSourceFromHash);

gifSrcInput.addEventListener('input', () => {
	const newSrc = gifSrcInput.value;
	player.setAttribute('src', newSrc);
});

speedInput.addEventListener('input', () => {
	const newSpeed = speedInput.value;
	player.setAttribute('speed', newSpeed);
	document.querySelector('label[for="speed"]').textContent = `Speed: ${newSpeed}`;
	updateResetButtonState();
});

scaleInput.addEventListener('input', () => {
	const newScale = scaleInput.value;
	player.style.transform = `scale(${newScale}) rotate(${rotationInput.value}deg)`;
	document.querySelector('label[for="scale"]').textContent = `Image Scale: ${newScale}`;
	updateResetButtonState();
});

rotationInput.addEventListener('input', () => {
	const newRotation = rotationInput.value;
	player.style.transform = `scale(${scaleInput.value}) rotate(${newRotation}deg)`;
	document.querySelector('label[for="rotation"]').textContent = `Rotation: ${newRotation}`;
	updateResetButtonState();
});

bounceToggle.addEventListener('click', () => {
	bounceToggle.classList.toggle('active');
	const isBounceActive = bounceToggle.classList.contains('active');
	if (isBounceActive) {
		player.setAttribute('bounce', '');
	} else {
		player.removeAttribute('bounce');
	}
	updateResetButtonState();
});

forwardButton.addEventListener('click', () => {
	forwardButton.classList.add('active');
	backwardButton.classList.remove('active');
	player.setAttribute('direction', '1');
	updateResetButtonState();
});

backwardButton.addEventListener('click', () => {
	backwardButton.classList.add('active');
	forwardButton.classList.remove('active');
	player.setAttribute('direction', '-1');
	updateResetButtonState();
});

resetButton.addEventListener('click', () => {
	speedInput.value = defaultSpeed;
	scaleInput.value = defaultScale;
	rotationInput.value = defaultRotation;
	player.setAttribute('speed', defaultSpeed);
	player.style.transform = `scale(${defaultScale}) rotate(${defaultRotation}deg)`;
	document.querySelector('label[for="speed"]').textContent = `Speed: ${defaultSpeed}`;
	document.querySelector('label[for="scale"]').textContent = `Image Scale: ${defaultScale}`;
	document.querySelector('label[for="rotation"]').textContent = `Rotation: ${defaultRotation}`;
	bounceToggle.classList.remove('active');
	player.removeAttribute('bounce');
	forwardButton.classList.add('active');
	backwardButton.classList.remove('active');
	player.setAttribute('direction', '1');
	updateResetButtonState();
});

function updateResetButtonState() {
	const isSpeedDefault = parseFloat(speedInput.value) === defaultSpeed;
	const isScaleDefault = parseFloat(scaleInput.value) === defaultScale;
	const isRotationDefault = parseFloat(rotationInput.value) === defaultRotation;
	const isBounceDefault = !bounceToggle.classList.contains('active');
	const isForwardDefault = forwardButton.classList.contains('active');

	if (
		isSpeedDefault &&
		isScaleDefault &&
		isRotationDefault &&
		isBounceDefault &&
		isForwardDefault
	) {
		resetButton.classList.remove('active');
	} else {
		resetButton.classList.add('active');
	}
}
updateResetButtonState();
