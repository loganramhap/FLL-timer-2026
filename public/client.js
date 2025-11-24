const timerDisplay = document.getElementById('timer');
const startStopBtn = document.getElementById('startStopBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const statusDiv = document.getElementById('status');
const roomCodeModal = document.getElementById('roomCodeModal');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');

let ws;
let timerInterval;
let currentTime = 150;
let warningPlayed = false;
let currentRoomCode = null;
let isRunning = false;

// Audio management with default sounds
const audioFiles = {
  start: null,
  warning: null,
  end: null,
  abort: null
};

// Initialize default sounds
function initDefaultSounds() {
  // Try to load default audio files first, fallback to beeps
  const defaultSounds = {
    start: '/sounds/start.mp3',
    warning: '/sounds/warning.mp3',
    end: '/sounds/end.mp3',
    abort: '/sounds/abort.mp3'
  };
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Try to load each sound file, fallback to beep if not found
  Object.keys(defaultSounds).forEach(type => {
    const audio = new Audio(defaultSounds[type]);
    audio.addEventListener('error', () => {
      // Fallback to beep sounds if file doesn't exist
      const frequencies = { start: 800, warning: 1000, end: 600, abort: 400 };
      const durations = { start: 0.2, warning: 0.3, end: 0.5, abort: 0.3 };
      const counts = { start: 1, warning: 2, end: 3, abort: 1 };
      audioFiles[type] = createBeep(audioContext, frequencies[type], durations[type], counts[type]);
    });
    audio.addEventListener('canplaythrough', () => {
      audioFiles[type] = audio;
    }, { once: true });
  });
}

function createBeep(audioContext, frequency, duration, count = 1) {
  return {
    play: () => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, i * (duration * 1000 + 100));
      }
    }
  };
}

// Room code handlers
joinRoomBtn.addEventListener('click', joinRoom);
roomCodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinRoom();
  }
});

function joinRoom() {
  const code = roomCodeInput.value.trim();
  if (code.length >= 3 && code.length <= 20) {
    currentRoomCode = code;
    roomCodeModal.style.display = 'none';
    roomCodeDisplay.textContent = `Room: ${code}`;
    connectWebSocket();
  } else {
    alert('Please enter a room code (3-20 characters)');
  }
}

// Settings modal handlers
settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

closeSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
});

// Handle sound uploads
document.getElementById('startSound').addEventListener('change', (e) => handleSoundUpload(e, 'start'));
document.getElementById('warningSound').addEventListener('change', (e) => handleSoundUpload(e, 'warning'));
document.getElementById('endSound').addEventListener('change', (e) => handleSoundUpload(e, 'end'));
document.getElementById('abortSound').addEventListener('change', (e) => handleSoundUpload(e, 'abort'));

// Handle test buttons
document.querySelectorAll('.btn-test').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const soundType = e.target.getAttribute('data-sound');
    playSound(soundType);
  });
});

function handleSoundUpload(event, type) {
  const file = event.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audioFiles[type] = audio;
  }
}

function playSound(type) {
  if (audioFiles[type]) {
    audioFiles[type].currentTime = 0;
    audioFiles[type].play().catch(e => console.log('Audio play failed:', e));
  }
}

function connectWebSocket() {
  if (!currentRoomCode) return;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}?room=${currentRoomCode}`);
  
  ws.onopen = () => {
    statusDiv.textContent = 'Connected';
    statusDiv.className = 'status connected';
  };
  
  ws.onclose = () => {
    statusDiv.textContent = 'Disconnected';
    statusDiv.className = 'status disconnected';
    setTimeout(connectWebSocket, 2000);
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleServerMessage(data);
  };
}

function handleServerMessage(data) {
  switch(data.type) {
    case 'state':
      currentTime = data.timeLeft;
      isRunning = data.isRunning;
      updateDisplay(currentTime);
      updateButtonState();
      if (data.isRunning) {
        startTimer(data.startTime);
      }
      break;
    
    case 'start':
      currentTime = data.timeLeft;
      isRunning = true;
      warningPlayed = false;
      startTimer(data.startTime);
      updateButtonState();
      playSound('start');
      break;
    
    case 'stop':
      stopTimer();
      isRunning = false;
      currentTime = data.timeLeft;
      updateDisplay(currentTime);
      updateButtonState();
      playSound('abort');
      break;
    
    case 'reset':
      stopTimer();
      isRunning = false;
      currentTime = 150;
      warningPlayed = false;
      updateDisplay(currentTime);
      updateButtonState();
      break;
  }
}

function updateButtonState() {
  if (isRunning) {
    startStopBtn.textContent = 'ABORT';
    startStopBtn.className = 'btn btn-stop';
  } else {
    startStopBtn.textContent = 'START';
    startStopBtn.className = 'btn btn-start';
  }
}

function startTimer(serverStartTime) {
  stopTimer();
  
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
    currentTime = Math.max(0, 150 - elapsed);
    
    updateDisplay(currentTime);
    
    // Play warning at 30 seconds
    if (currentTime === 30 && !warningPlayed) {
      playSound('warning');
      warningPlayed = true;
    }
    
    // Timer ended
    if (currentTime <= 0) {
      stopTimer();
      playSound('end');
      ws.send(JSON.stringify({ type: 'stop', timeLeft: 0 }));
    }
  }, 100);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  
  // Dynamic color based on time remaining
  timerDisplay.className = '';
  if (seconds <= 10) {
    timerDisplay.className = 'critical';
  } else if (seconds <= 30) {
    timerDisplay.className = 'warning';
  } else if (seconds <= 60) {
    timerDisplay.style.color = '#ffff00'; // Yellow
    timerDisplay.style.textShadow = '0 0 60px #ffff00';
  } else if (seconds <= 90) {
    timerDisplay.style.color = '#00ffff'; // Cyan
    timerDisplay.style.textShadow = '0 0 60px #00ffff';
  } else {
    timerDisplay.style.color = '#00ff00'; // Green
    timerDisplay.style.textShadow = '0 0 60px #00ff00';
  }
}

// Button handlers
startStopBtn.addEventListener('click', () => {
  if (ws.readyState === WebSocket.OPEN) {
    if (isRunning) {
      ws.send(JSON.stringify({ type: 'stop', timeLeft: currentTime }));
    } else {
      ws.send(JSON.stringify({ type: 'start' }));
    }
  }
});

resetBtn.addEventListener('click', () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'reset' }));
  }
});

// Initialize
initDefaultSounds();
// Don't auto-connect, wait for room code
