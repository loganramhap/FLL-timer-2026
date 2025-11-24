# Robotics Event Timer

A synchronized timer system for robotics events with real-time control across multiple displays.

## Features
- 2:30 default countdown timer
- Real-time synchronization across all connected clients
- Start, Stop, and Reset controls (accessible from any client)
- Custom sound effects (start, 30-second warning, end, abort)
- Large display optimized for TVs
- Visual warnings at 30 seconds (orange) and 10 seconds (red with pulse)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the timer:
   - On the host machine: http://localhost:3000
   - From other devices: http://YOUR_LOCAL_IP:3000

## Finding Your Local IP

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Look for your local network IP (usually starts with 192.168.x.x or 10.x.x.x)

## Usage

1. Open the timer URL on all displays and control devices
2. Upload your custom sound effects using the file inputs (optional)
3. Any connected client can control the timer using Start/Stop/Reset buttons
4. All displays will stay synchronized automatically

## Sound Effects

The system will automatically look for default sound files in `public/sounds/`:
- `start.mp3` - Plays when timer begins
- `warning.mp3` - Warning sound at 30-second mark
- `end.mp3` - Plays when timer reaches 0:00
- `abort.mp3` - Plays when timer is stopped before completion

If these files don't exist, the system will use built-in beep sounds.

You can also upload custom sounds through the Settings menu (⚙️ button) and test them with the Test buttons.

Supported formats: MP3, WAV, OGG
