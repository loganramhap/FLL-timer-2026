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
let clockOffset = 0; // Difference between server and client time

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
    warning: '/sounds/end-game.mp3',
    end: '/sounds/end.mp3',
    abort: '/sounds/stop.mp3'
  };
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Try to load each sound file, fallback to beep if not found
  Object.keys(defaultSounds).forEach(type => {
    const audio = new Audio(defaultSounds[type]);
    audio.preload = 'auto'; // Preload audio files
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
    // Start loading immediately
    audio.load();
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
  const code = roomCodeInput.value.trim().toLowerCase();
  if (code.length >= 3 && code.length <= 20) {
    currentRoomCode = code;
    // Store room code with TTL (24 hours)
    const roomData = {
      code: code,
      timestamp: Date.now()
    };
    localStorage.setItem('roomCode', JSON.stringify(roomData));
    
    roomCodeModal.style.display = 'none';
    roomCodeDisplay.textContent = `Room: ${code.toUpperCase()}`;
    connectWebSocket();
  } else {
    alert('Please enter a room code (3-20 characters)');
  }
}

function loadSavedRoomCode() {
  const savedRoom = localStorage.getItem('roomCode');
  if (savedRoom) {
    try {
      const roomData = JSON.parse(savedRoom);
      const TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (Date.now() - roomData.timestamp < TTL) {
        // Room code is still valid
        currentRoomCode = roomData.code;
        roomCodeModal.style.display = 'none';
        roomCodeDisplay.textContent = `Room: ${roomData.code.toUpperCase()}`;
        connectWebSocket();
        return true;
      } else {
        // Room code expired, remove it
        localStorage.removeItem('roomCode');
      }
    } catch (e) {
      // Invalid data, remove it
      localStorage.removeItem('roomCode');
    }
  }
  return false;
}

// Room code badge click handler
roomCodeDisplay.addEventListener('click', () => {
  // Clear current connection
  if (ws) {
    ws.close();
  }
  // Clear saved room code
  localStorage.removeItem('roomCode');
  // Reset state
  currentRoomCode = null;
  roomCodeInput.value = '';
  // Show room code modal
  roomCodeModal.style.display = 'flex';
  statusDiv.textContent = 'Disconnected';
  statusDiv.className = 'status disconnected';
});

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
    try {
      // Clone audio for overlapping sounds
      if (audioFiles[type].cloneNode) {
        const sound = audioFiles[type].cloneNode();
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Audio play failed:', e));
      } else if (audioFiles[type].play) {
        // For beep sounds
        audioFiles[type].play();
      }
    } catch (e) {
      console.log('Sound playback error:', e);
    }
  } else {
    console.log(`Sound '${type}' not loaded yet`);
  }
}

function connectWebSocket() {
  if (!currentRoomCode) return;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}?room=${currentRoomCode}`);
  
  ws.onopen = () => {
    statusDiv.textContent = 'Connected';
    statusDiv.className = 'status connected';
    // Sync clock with server
    syncClock();
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

function syncClock() {
  const clientTime = Date.now();
  ws.send(JSON.stringify({ type: 'sync', clientTime }));
}

function handleServerMessage(data) {
  switch(data.type) {
    case 'sync':
      // Calculate clock offset for better synchronization
      const roundTripTime = Date.now() - data.clientTime;
      clockOffset = data.serverTime - Date.now() + (roundTripTime / 2);
      console.log(`Clock sync: offset ${clockOffset}ms`);
      break;
      
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
      // Play sound for all clients (including the one who started it, in case it didn't play on click)
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
    
    case 'end':
      stopTimer();
      isRunning = false;
      currentTime = 0;
      updateDisplay(currentTime);
      updateButtonState();
      playSound('end');
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
    // Use server time for more accurate synchronization
    const now = Date.now() + clockOffset;
    const elapsed = Math.floor((now - serverStartTime) / 1000);
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
      ws.send(JSON.stringify({ type: 'end', timeLeft: 0 }));
    }
  }, 50); // Update more frequently for smoother display
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
// Try to load saved room code, otherwise show room code modal
if (!loadSavedRoomCode()) {
  roomCodeModal.style.display = 'flex';
}
