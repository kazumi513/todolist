let pomodoroCount = 0;
let timerInterval;
let currentSession = 0;

// DOM Elements
const pomodoroWindow = document.getElementById('pomodoro-window');
const flipClock = document.querySelector('.flip-clock');
const dock = document.getElementById('dock');
const player = document.getElementById('lofi-player');
const timerDisplay = document.querySelector('.timer-time');
const tabButtons = document.querySelectorAll('.tab-button');
const startPauseBtn = document.getElementById('start-pause-btn');
const startPauseText = document.getElementById('start-pause-text');
const resetBtn = document.getElementById('reset-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const pomodoroLengthInput = document.getElementById('pomodoro-length');
const shortBreakLengthInput = document.getElementById('short-break-length');
const longBreakLengthInput = document.getElementById('long-break-length');
const soundToggle = document.getElementById('sound-toggle');
const soundTheme = document.getElementById('sound-theme');
const particlesContainer = document.getElementById('particles-container');
const progressDots = document.querySelectorAll('.progress-dots .dot');

// Timer state
let timer = {
    seconds: 0,
    isRunning: false,
    intervalId: null,
    mode: 'pomodoro', // Current active mode
    durations: {
        pomodoro: 25 * 60, // 25 minutes in seconds
        shortBreak: 5 * 60, // 5 minutes in seconds
        longBreak: 15 * 60 // 15 minutes in seconds
    },
    settings: {
        soundEnabled: true,
        soundTheme: 'minimal'
    },
    lastTimestamp: null
};

// Draggable Pomodoro Window
let isDragging = false;
let offsetX, offsetY;

// Initialize the application
function init() {
    loadSettings();
    loadTimerState();
    updateDisplay();
    setupEventListeners();
    setupDraggable();
}

// Make pomodoro window draggable
function setupDraggable() {
    const headerElement = pomodoroWindow.querySelector('.header');
    
    headerElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - pomodoroWindow.getBoundingClientRect().left;
        offsetY = e.clientY - pomodoroWindow.getBoundingClientRect().top;
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            pomodoroWindow.style.left = `${e.clientX - offsetX}px`;
            pomodoroWindow.style.top = `${e.clientY - offsetY}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Load saved settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        timer.durations.pomodoro = settings.pomodoro * 60;
        timer.durations.shortBreak = settings.shortBreak * 60;
        timer.durations.longBreak = settings.longBreak * 60;
        timer.settings.soundEnabled = settings.soundEnabled;
        timer.settings.soundTheme = settings.soundTheme;
        
        // Update settings UI
        pomodoroLengthInput.value = settings.pomodoro;
        shortBreakLengthInput.value = settings.shortBreak;
        longBreakLengthInput.value = settings.longBreak;
        soundToggle.checked = settings.soundEnabled;
        soundTheme.value = settings.soundTheme;
    }
}

// Load timer state from localStorage
function loadTimerState() {
    const savedMode = localStorage.getItem('pomodoroMode');
    if (savedMode) {
        timer.mode = savedMode;
    }
    
    const savedTimerState = localStorage.getItem('pomodoroTimerState');
    if (savedTimerState) {
        try {
            const { seconds, isRunning, lastTimestamp } = JSON.parse(savedTimerState);
            
            // If timer was running when page closed, calculate elapsed time
            if (isRunning && lastTimestamp) {
                const elapsedSeconds = Math.floor((Date.now() - lastTimestamp) / 1000);
                const newSeconds = Math.max(0, seconds - elapsedSeconds);
                timer.seconds = newSeconds;
                
                // Only restart if there's time left
                if (newSeconds > 0) {
                    timer.isRunning = true;
                    startTimer();
                } else {
                    timer.seconds = 0;
                    timer.isRunning = false;
                }
            } else {
                timer.seconds = seconds;
                timer.isRunning = false;
            }
        } catch (error) {
            console.error('Error restoring timer state:', error);
            resetTimer();
        }
    } else {
        resetTimer();
    }
    
    // Update active tab
    tabButtons.forEach(button => {
        if (button.dataset.mode === timer.mode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Reset timer to default values for selected mode
function resetTimer() {
    stopTimer();
    timer.seconds = timer.durations[timer.mode];
    timer.isRunning = false;
    updateDisplay();
    saveTimerState();
}

// Format seconds to MM:SS
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update the timer display
function updateDisplay() {
    timerDisplay.textContent = formatTime(timer.seconds);
    
    // Update start/pause button
    if (timer.isRunning) {
        startPauseText.textContent = 'Pause';
    } else {
        startPauseText.textContent = 'Start';
    }
    
    // Update progress dots
    let activeDotIndex = 0;
    if (timer.mode === 'shortBreak') activeDotIndex = 1;
    if (timer.mode === 'longBreak') activeDotIndex = 2;
    
    progressDots.forEach((dot, index) => {
        if (index === activeDotIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Start the timer
function startTimer() {
    if (timer.seconds === 0) return;
    
    timer.isRunning = true;
    updateDisplay();
    
    let lastTick = Date.now();
    timer.lastTimestamp = lastTick;
    
    // Clear any existing interval
    if (timer.intervalId) clearInterval(timer.intervalId);
    
    // Start interval
    timer.intervalId = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.floor((now - lastTick) / 1000);
        
        if (deltaSeconds >= 1) {
            timer.seconds = Math.max(0, timer.seconds - deltaSeconds);
            updateDisplay();
            
            if (timer.seconds === 0) {
                stopTimer();
                if (timer.settings.soundEnabled) {
                    playTimerEndSound();
                }
            }
            
            lastTick = now;
            timer.lastTimestamp = now;
            saveTimerState();
        }
    }, 100);
    
    // Start particle animation
    startParticleAnimation();
}

// Stop the timer
function stopTimer() {
    timer.isRunning = false;
    if (timer.intervalId) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
    }
    updateDisplay();
    saveTimerState();
}

// Save timer state to localStorage
function saveTimerState() {
    localStorage.setItem('pomodoroTimerState', JSON.stringify({
        seconds: timer.seconds,
        isRunning: timer.isRunning,
        lastTimestamp: timer.lastTimestamp
    }));
}

// Save timer mode to localStorage
function saveTimerMode() {
    localStorage.setItem('pomodoroMode', timer.mode);
}

// Handle mode changes
function changeMode(mode) {
    if (mode === timer.mode) return;
    
    if (timer.isRunning) {
        stopTimer();
    }
    
    timer.mode = mode;
    resetTimer();
    saveTimerMode();
    
    // Update active tab
    tabButtons.forEach(button => {
        if (button.dataset.mode === mode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Save settings
function saveSettings() {
    const newSettings = {
        pomodoro: parseInt(pomodoroLengthInput.value, 10) || 25,
        shortBreak: parseInt(shortBreakLengthInput.value, 10) || 5,
        longBreak: parseInt(longBreakLengthInput.value, 10) || 15,
        soundEnabled: soundToggle.checked,
        soundTheme: soundTheme.value
    };
    
    timer.durations = {
        pomodoro: newSettings.pomodoro * 60,
        shortBreak: newSettings.shortBreak * 60,
        longBreak: newSettings.longBreak * 60
    };
    
    timer.settings = {
        soundEnabled: newSettings.soundEnabled,
        soundTheme: newSettings.soundTheme
    };
    
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
    
    // Reset the timer for the current mode
    resetTimer();
    
    // Close the settings panel
    toggleSettings(false);
}

// Toggle settings panel
function toggleSettings(show) {
    if (show) {
        settingsPanel.classList.add('open');
    } else {
        settingsPanel.classList.remove('open');
    }
}

// Play sound when timer ends
function playTimerEndSound() {
    // You can implement different sound themes here
    const audio = new Audio(`https://assets.mixkit.co/sfx/preview/mixkit-clear-announce-tones-2861.mp3`);
    audio.play();
}

// Start particle animation (decorative effect for the timer)
function startParticleAnimation() {
    if (!particlesContainer) return;
    
    const createParticles = () => {
        if (!timer.isRunning) return;
        
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random position
        const position = Math.random() * 100;
        particle.style.left = `${position}%`;
        
        // Random size
        const size = Math.random() * 6 + 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random duration
        const duration = Math.random() * 2 + 3;
        particle.style.setProperty('--duration', `${duration}s`);
        
        particlesContainer.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, duration * 1000);
    };
    
    // Create particles at interval
    const particleInterval = setInterval(createParticles, 300);
    
    // Clear interval when timer stops
    const checkRunning = setInterval(() => {
        if (!timer.isRunning) {
            clearInterval(particleInterval);
            clearInterval(checkRunning);
        }
    }, 1000);
}

// Close the pomodoro window
function closeWindow() {
    pomodoroWindow.style.display = 'none';
}

// Setup event listeners
function setupEventListeners() {
    // Start/Pause Button
    startPauseBtn.addEventListener('click', () => {
        if (timer.isRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    });
    
    // Reset Button
    resetBtn.addEventListener('click', resetTimer);
    
    // Mode Tabs
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            changeMode(mode);
        });
    });
    
    // Settings
    settingsBtn.addEventListener('click', () => toggleSettings(true));
    closeSettingsBtn.addEventListener('click', () => toggleSettings(false));
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // Click outside settings to close
    settingsPanel.querySelector('.settings-backdrop').addEventListener('click', () => toggleSettings(false));
}

// Channel Handling
function changeChannel(videoId) {
    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0`;
}

const channels = [
'M-4zE2GG87w', 'r3JG5gBLbpA', 'vrB9wC6quaU', '92PvEVG0sKI', 'hB2LatX6NLg','vYIYIVmOo3Q', 'CX9_h23icoM', 'yf5NOyy1SXU',
'4LIu4EyuDXI', '5yx6BWlEVcY', '0pb3E4PGxq8','Vg13S-zzol0','FYJ7RCDgFwE', 'LC0fYEpy2ng', 'nP-aOc7g228', '5D5b0-hfzno',
'jEIFHt4q6nA', 'IDZHHQsmvmc','yr9ZxQaWkqs', '_mHmfLfx0NU', 'x0OLPEjna8A', 'KMXZF-K2mus', 'GB7kh1tvZxY', 'orFvdB0gJng',
'XM8bbRA3qio', 'd_t5nnK9Rn4', '28KRPhVzCus', 'ft6R-UNXLSs', 'snL_Pdh51ww', 'dw_Bx0e0lis','pxWfp8Hxazo','x9MolslcpzU',
'1AOMHYL_pz4','jfKfPfyJRdk', 'R4jvhTed_gM', 'WcI5cDt37ec', '7NOSDKb0HlU','PRgS7hBgR1k','Lv0SzPoZltY', '6tWWPn1lYgU', 
'erUTqlcsDJI', 'Na0w3Mz46GA', 'wJSg1H8wOUg', 'pJE-euPdroo' ];

function surpriseChannel() {
    changeChannel(channels[Math.floor(Math.random() * channels.length)]);
}

// Dock visibility control
let dockTimeout;

dock.addEventListener('mouseenter', () => {
    clearTimeout(dockTimeout);
});
dock.addEventListener('mouseleave', () => {
    dockTimeout = setTimeout(() => {
        dock.classList.remove('visible');
    }, 3000);
});

document.addEventListener('mousemove', (e) => {
    if (e.clientY > window.innerHeight - 50) {
        dock.classList.add('visible');
        clearTimeout(dockTimeout);
        dockTimeout = setTimeout(() => dock.classList.remove('visible'), 3000);
    }
});

// Initialize the app when the document is ready
document.addEventListener('DOMContentLoaded', init);



