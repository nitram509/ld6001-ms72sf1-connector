'use strict';

import {Ld6001Parser} from './ld6001-parser.js';

const appElements = {
    connectBtn: document.getElementById('connect-btn'),
    portSelect: document.getElementById('port-select'),
    targetsGroup: document.getElementById('targets-group'),
    noDataInfo: document.getElementById('no-data-info'),
    radarContainer: document.getElementById('radar-container'),
}


const TARGET_COLORS = [
    '#5755d9', // Blue
    '#32b643', // Green
    '#e85600', // Orange
    '#ffb700', // Yellow
    '#00d1b2', // Teal
    '#f03d5d', // Pink/Red
    '#9c27b0', // Purple
    '#3f51b5', // Indigo
    '#00bcd4', // Cyan
    '#ff5722'  // Deep Orange
];

let port;
let reader;
let keepReading = true;

//# TODO finetuning required
let maxX = 1200;
let minX = -1200;
let maxY = 2000;

async function updatePortList() {
    if (!('serial' in navigator)) {
        return;
    }
    const ports = await navigator.serial.getPorts();
    // Clear all except the first option
    while (appElements.portSelect.options.length > 1) {
        appElements.portSelect.remove(1);
    }
    ports.forEach((p, index) => {
        const option = document.createElement('option');
        option.text = `Port ${index + 1}`;
        option.value = index;
        appElements.portSelect.add(option);
    });
}

async function connect() {
    try {
        if (!port) {
            port = await navigator.serial.requestPort();
        }

        await port.open({baudRate: 115200});
        console.log('Port opened');
        appElements.connectBtn.textContent = 'Disconnect';
        appElements.connectBtn.classList.remove('btn-primary');
        appElements.connectBtn.classList.add('btn-error');

        await initializeSensor();

        readLoop();
    } catch (error) {
        console.error('Error connecting:', error);
        alert('Could not connect to serial port: ' + error.message);
    }
}

async function disconnect() {
    keepReading = false;
    if (reader) {
        await reader.cancel();
    }
    if (port) {
        await port.close();
        // await port.forget(); // Keep the permission for future connections
        port = null;
    }
    appElements.connectBtn.textContent = 'Connect';
    appElements.connectBtn.classList.remove('btn-error');
    appElements.connectBtn.classList.add('btn-primary');
    console.log('Port closed');
}

async function sendSerialCommand(command) {
    if (!port || !port.writable) {
        console.error('Port not writable');
        return;
    }
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    try {
        await writer.write(encoder.encode(command));
        console.log(`Sent command: ${command.trim()}`);
    } catch (error) {
        console.error('Error sending command:', error);
    } finally {
        writer.releaseLock();
    }
}

async function initializeSensor() {
    console.log('Initializing sensor...');
    // The command is AT+DEBUG=3\n - where \n is a newline.
    // await sendSerialCommand('AT+DEBUG=3\n');
    await sendSerialCommand('AT+START\n');
}

async function readLoop() {
    keepReading = true;
    while (port.readable && keepReading) {
        reader = port.readable.getReader();
        appElements.radarContainer.classList.remove('d-none');
        appElements.noDataInfo.classList.add('d-none');
        try {
            while (true) {
                const {value, done} = await reader.read();
                if (done) {
                    break;
                }
                if (value) {
                    // console.log('Received data:', value);
                    // console.log('Received data (ASCII):', new TextDecoder().decode(value));
                    if (parser) {
                        const results = parser.parse(value);
                        if (results.length > 0) {
                            renderTargets(results);
                            console.log('Detected targets:', results.length);
                            for (const target of results) {
                                const distance = Math.sqrt(target.x ** 2 + target.y ** 2 + target.z ** 2);
                                let id = [
                                    (target.objectId & 0xff000000) >> 24,
                                    (target.objectId & 0x00ff0000) >> 16,
                                    (target.objectId & 0x0000ff00) >> 8,
                                    (target.objectId & 0x000000ff),
                                ]
                                console.log(`Target ${id}, ${target.objectId}: x=${target.x.toFixed(2)}, y=${target.y.toFixed(2)}, z=${target.z.toFixed(2)}, dist=${distance.toFixed(2)}`);
                            }
                        } else {
                            if (appElements.noDataInfo) appElements.noDataInfo.classList.remove('d-none');
                            // clearTargets();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Read error:', error);
        } finally {
            reader.releaseLock();
            // appElements.radarContainer.classList.add('d-none');
            appElements.noDataInfo.classList.remove('d-none');
        }
    }
}

appElements.connectBtn.addEventListener('click', () => {
    if (port && port.readable) {
        disconnect();
    } else {
        connect();
    }
});

function clearTargets() {
    if (appElements.targetsGroup) {
        appElements.targetsGroup.innerHTML = '';
    }
}

function renderTargets(targets) {
    if (!appElements.targetsGroup) return;

    // Simple way: clear and redraw. For 3 objects, this is fine for performance.
    appElements.targetsGroup.innerHTML = '';

    let maxTargets = 3;

    targets.forEach(target => {
        // if (maxTargets <= 0) return;
        // maxTargets--;

        const color = TARGET_COLORS[target.objectId % TARGET_COLORS.length] || '#acb3be';
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        if (target.x > 0) { // auto-detect min/max X
            maxX = Math.max(maxX, target.x)
        } else {
            minX = Math.min(minX, target.x)
        }
        maxY = Math.max(maxY, Math.abs(target.y)); // auto-detect max Y

        const screenHeight = 2000 - 100;
        const screenWidth = 1000 - 100;

        let renderX = 0;
        if (target.x > 0) {
            // invert x to match the radar's coordinate system'
            renderX = -1 * target.x * screenWidth / maxX;
        } else {
            renderX = target.x * screenWidth / minX;
        }
        const renderY = target.y * screenHeight / maxY;


        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', renderX);
        dot.setAttribute('cy', renderY);
        dot.setAttribute('r', '40');
        dot.setAttribute('fill', color);
        dot.classList.add('person-dot');

        // Speed-based glow effect
        // Speed in the new protocol is represented by vx, vy, vz components (m/s).
        const speed = Math.sqrt(target.vx ** 2 + target.vy ** 2 + target.vz ** 2);

        dot.classList.add('glow');
        const glowIntensity = Math.min(speed * 10, 50); // Scale for visual effect
        dot.style.filter = `drop-shadow(0 0 ${glowIntensity}px ${color})`;

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', renderX);
        label.setAttribute('y', renderY + 80);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'person-label');
        const distance = Math.sqrt(target.x ** 2 + target.y ** 2 + target.z ** 2);
        label.textContent = `#${target.objectId} | ${distance.toFixed(2)}m | x=${target.x.toFixed(2)} | y=${target.y.toFixed(2)}`;

        g.appendChild(dot);
        g.appendChild(label);
        appElements.targetsGroup.appendChild(g);
    });
}

const parser = new Ld6001Parser();

async function initAfterLoad() {
    if ('serial' in navigator) {
        updatePortList();
        navigator.serial.addEventListener('connect', updatePortList);
        navigator.serial.addEventListener('disconnect', updatePortList);
    } else {
        const msg = 'Web Serial API not supported in this browser.';
        console.error(msg);
        appElements.connectBtn.disabled = true;
        appElements.portSelect.disabled = true;
        const subtitle = document.querySelector('.empty-subtitle');
        if (subtitle) subtitle.textContent = msg;
    }
}

window.addEventListener('load', () => {
    initAfterLoad();
});

