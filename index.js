'use strict';

import {Ld6001Parser} from './ld6001-parser.js';

const MAX_SENSOR_ELEMENTS = 10;

const TARGET_COLORS = [
    '#7231e6', // Blue
    '#32b643', // Green
    '#ac7654', // Orange
    '#ffb700', // Yellow
    '#00d1b2', // Teal
    '#f03d5d', // Pink/Red
    '#9c27b0', // Purple
    '#3448bc', // Indigo
    '#036f80', // Cyan
    '#265e0f'  // dark green
];

/**************************************************************************************************************
 * Connector UI class
 */
class AppUI {

    constructor() {
        this.btnConnect = document.getElementById('btn-connect');
        this.btnStart = document.getElementById('btn-start');
        this.btnStop = document.getElementById('btn-stop');
        this.coordPointsLayer = document.getElementById('coord-points-layer');

        this.modalHelp = document.getElementById('modal-help');
        this.btnCloseHelp = document.getElementById('btn-close-help');
        this.btnShowHelp = document.getElementById('btn-show-help');
        this.aCloseHelp = document.getElementById('a-close-help');

        this.sensorElements = [];
        for (let i = 0; i < MAX_SENSOR_ELEMENTS; i++) {
            let tileElem = document.getElementById("sensor-" + i);
            tileElem.getElementsByClassName("tile-icon")[0].style.backgroundColor = TARGET_COLORS[i];
            this.sensorElements.push({
                tile: tileElem,
                divider: document.getElementById("sensor-divider-" + i),
                x: document.getElementById("sensor-" + i + "-x"),
                y: document.getElementById("sensor-" + i + "-y"),
                z: document.getElementById("sensor-" + i + "-z"),
                vx: document.getElementById("sensor-" + i + "-vx"),
                vy: document.getElementById("sensor-" + i + "-vy"),
                vz: document.getElementById("sensor-" + i + "-vz"),
            });
        }

        const hideAllSensorElements = function () {
            for (let i = 0; i < MAX_SENSOR_ELEMENTS; i++) {
                this.hide(this.sensorElements[i].tile);
                this.hide(this.sensorElements[i].divider);
            }
        }
        requestAnimationFrame(hideAllSensorElements.bind(this));

        this.txtSensorXMinMax = document.getElementById("sensor-x-min-max");
        this.txtSensorYMinMax = document.getElementById("sensor-y-min-max");
        this.txtSensorZMinMax = document.getElementById("sensor-z-min-max");
        this.txtSensorVXMinMax = document.getElementById("sensor-vx-min-max");
        this.txtSensorVYMinMax = document.getElementById("sensor-vy-min-max");
        this.txtSensorVZMinMax = document.getElementById("sensor-vz-min-max");

        // View State
        this.min_x = 0;
        this.min_y = 0;
        this.min_z = 0;
        this.min_vx = 0;
        this.min_vy = 0;
        this.min_vz = 0;
        this.max_x = 0;
        this.max_y = 0;
        this.max_z = 0;
        this.max_vx = 0;
        this.max_vy = 0;
        this.max_vz = 0;
        this.no_of_sensors = 0;
    }

    /**
     * @param {SensorData[]} sensorDatas
     */
    async renderSensorData(sensorDatas) {
        if (sensorDatas.length === 0) {
            return
        }

        const number_of_updates = Math.min(sensorDatas.length, MAX_SENSOR_ELEMENTS);
        for (let i = 0; i < number_of_updates; i++) {
            const sd = sensorDatas[i];
            this.min_x = Math.min(this.min_x, sd.x);
            this.min_y = Math.min(this.min_y, sd.y);
            this.min_z = Math.min(this.min_z, sd.z);
            this.max_x = Math.max(this.max_x, sd.x);
            this.max_y = Math.max(this.max_y, sd.y);
            this.max_z = Math.max(this.max_z, sd.z);
            this.min_vx = Math.min(this.min_vx, sd.vx);
            this.min_vy = Math.min(this.min_vy, sd.vy);
            this.min_vz = Math.min(this.min_vz, sd.vz);
            this.max_vx = Math.max(this.max_vx, sd.vx);
            this.max_vy = Math.max(this.max_vy, sd.vy);
            this.max_vz = Math.max(this.max_vz, sd.vz);
        }

        const maxMovement = Math.max(
            Math.abs(this.min_vx), Math.abs(this.min_vy), Math.abs(this.min_vz),
            Math.abs(this.max_vx), Math.abs(this.max_vy), Math.abs(this.max_vz)
        );
        while (this.coordPointsLayer.hasChildNodes()) {
            this.coordPointsLayer.removeChild(this.coordPointsLayer.firstChild);
        }

        const mustUpdateSensorDataListLength = sensorDatas.length !== this.no_of_sensors;
        this.no_of_sensors = sensorDatas.length;
        const updateSensorDatas = function () {
            for (let i = 0; i < MAX_SENSOR_ELEMENTS; i++) {
                const elem = this.sensorElements[i];
                if (i < sensorDatas.length) {
                    const sd = sensorDatas[i];
                    if (mustUpdateSensorDataListLength) {
                        this.show(elem.tile);
                        this.show(elem.divider);
                    }
                    elem.x.innerText = sd.x.toFixed(3);
                    elem.y.innerText = sd.y.toFixed(3);
                    elem.z.innerText = sd.z.toFixed(3);
                    elem.vx.innerText = sd.vx.toFixed(3);
                    elem.vy.innerText = sd.vy.toFixed(3);
                    elem.vz.innerText = sd.vz.toFixed(3);

                    const movement = Math.max(Math.abs(sd.vx), Math.abs(sd.vy), Math.abs(sd.vz));
                    drawCoordinateCircle(sd.x, sd.y, sd.z, TARGET_COLORS[i], movement / maxMovement);
                } else {
                    if (mustUpdateSensorDataListLength) {
                        this.hide(elem.tile);
                        this.hide(elem.divider);
                    }
                }
            }
        }
        requestAnimationFrame(updateSensorDatas.bind(this));

        const updateSensorDataHistory = function () {
            this.txtSensorXMinMax.innerHTML = `${this.min_x.toFixed(3)}<br>${this.max_x.toFixed(3)}`;
            this.txtSensorYMinMax.innerHTML = `${this.min_y.toFixed(3)}<br>${this.max_y.toFixed(3)}`;
            this.txtSensorZMinMax.innerHTML = `${this.min_z.toFixed(3)}<br>${this.max_z.toFixed(3)}`;
            this.txtSensorVXMinMax.innerHTML = `${this.min_vx.toFixed(3)}<br>${this.max_vx.toFixed(3)}`;
            this.txtSensorVYMinMax.innerHTML = `${this.min_vy.toFixed(3)}<br>${this.max_vy.toFixed(3)}`;
            this.txtSensorVZMinMax.innerHTML = `${this.min_vz.toFixed(3)}<br>${this.max_vz.toFixed(3)}`;
        }
        requestAnimationFrame(updateSensorDataHistory.bind(this));
    }

    enableSensorActions() {
        this.enable(this.btnStart);
        this.enable(this.btnStop);
    }

    disableSensorActions() {
        this.disable(this.btnStart);
        this.disable(this.btnStop);
    }

    show(element) {
        element.classList.remove('d-none');
    }

    hide(element) {
        element.classList.add('d-none');
    }

    enable(element) {
        element.classList.remove('disabled');
    }

    disable(element) {
        element.classList.add('disabled');
    }
}

/**************************************************************************************************************
 * Connector application class
 */
export class ConnectorApp {
    constructor() {
        this.appUi = new AppUI();
        this.parser = new Ld6001Parser();

        this.port = null;
        this.serialReader = null;
        this.keepReading = true;

        this.bindEvents();
    }

    bindEvents() {
        this.appUi.btnConnect.addEventListener('click', () => {
            if (this.port) {
                this.disconnect();
            } else {
                this.connect();
            }
        });

        this.appUi.btnStart.addEventListener('click', () => {
            if (this.port) {
                this.sendSerialCommand('AT+START\n');
            }
        });

        this.appUi.btnStop.addEventListener('click', () => {
            if (this.port) {
                this.sendSerialCommand('AT+STOP\n');
            }
        });
        this.appUi.btnCloseHelp.addEventListener('click', () => {
            this.appUi.hide(this.appUi.modalHelp);
        });
        this.appUi.aCloseHelp.addEventListener('click', () => {
            this.appUi.hide(this.appUi.modalHelp);
        });
        this.appUi.btnShowHelp.addEventListener('click', () => {
            this.appUi.show(this.appUi.modalHelp);
        });
    }

    async connect() {
        if (!this.port) {
            this.port = await navigator.serial.requestPort();
        }
        try {
            await this.port.open({baudRate: 115200});   // FIXME: use baudrate from DropDown
        } catch (error) {
            console.error('Error connecting:', error);
            alert('Could not connect to serial port: ' + error.message);
        }
        console.log('connected to ' + JSON.stringify(this.port.getInfo()));
        await this.post_connect()
        this.readLoop();
    }

    async disconnect() {
        this.keepReading = false;
        if (this.serialReader) {
            await this.serialReader.cancel();
        }
        if (this.port) {
            await this.port.close();
            await this.port.forget(); // don't keep the permission for future connections
            this.port = null;
        }
        await this.post_disconnect()
        console.log('disconnected.');
    }

    async sendSerialCommand(command) {
        if (!this.port || !this.port.writable) {
            console.error('Port not writable');
            return;
        }
        const encoder = new TextEncoder();
        const writer = this.port.writable.getWriter();
        try {
            await writer.write(encoder.encode(command));
            console.log(`Sent command: ${command.trim()}`);
        } catch (error) {
            console.error('Error sending command:', error);
        } finally {
            writer.releaseLock();
        }
    }

    async readLoop() {
        this.keepReading = true;
        while (this.port.readable && this.keepReading) {
            this.serialReader = this.port.readable.getReader();
            try {
                while (true) {
                    const {value, done} = await this.serialReader.read();
                    if (done) {
                        break;
                    }
                    if (value) {
                        // console.log('Received data:', value);
                        // console.log('Received data (ASCII):', new TextDecoder().decode(value));
                        if (this.parser) {
                            const sensorDatas = this.parser.parse(value);
                            this.appUi.renderSensorData(sensorDatas);

                            // if (sensorDatas.length > 0) {
                            // renderTargets(sensorDatas);
                            // console.log('Detected targets:', sensorDatas.length);
                            // for (const target of sensorDatas) {
                            //     const distance = Math.sqrt(target.x ** 2 + target.y ** 2 + target.z ** 2);
                            //     let id = [
                            //         (target.objectId & 0xff000000) >> 24,
                            //         (target.objectId & 0x00ff0000) >> 16,
                            //         (target.objectId & 0x0000ff00) >> 8,
                            //         (target.objectId & 0x000000ff),
                            //     ]
                            //     console.log(`Target ${id}, ${target.objectId}: x=${target.x.toFixed(2)}, y=${target.y.toFixed(2)}, z=${target.z.toFixed(2)}, dist=${distance.toFixed(2)}`);
                        }
                    }
                }
            } catch
                (error) {
                console.error('Read error:', error);
            } finally {
                this.serialReader.releaseLock();
            }
        }
    }

// --- Events --------------------------------------

    async post_connect() {
        const update = function () {
            this.appUi.enableSensorActions();
            this.appUi.btnConnect.textContent = 'Disconnect';
            this.appUi.btnConnect.classList.remove('btn-primary');
            this.appUi.btnConnect.classList.add('btn-error');
        }
        requestAnimationFrame(update.bind(this));
    }

    async post_disconnect() {
        const update = function () {
            this.appUi.disableSensorActions();
            this.appUi.btnConnect.textContent = 'Connect';
            this.appUi.btnConnect.classList.remove('btn-error');
            this.appUi.btnConnect.classList.add('btn-primary');
        }
        requestAnimationFrame(update.bind(this));
    }

}

/**
 * @param {ConnectorApp} app
 * @returns {Promise<void>}
 */
async function checkSerialIsAvailableInTheBrowser(app) {
    if (!('serial' in navigator)) {
        const msg = 'Web Serial API not supported in this browser.';
        console.error(msg);
    }
}

/**
 * Draws a circle in the 3D coordinate cube projected onto the existing SVG.
 *
 * Input ranges:
 * x: -5..5, y: -2..2, z: 0..20
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {string} color
 * @param {number} glowFactor 0..1
 */
function drawCoordinateCircle(x, y, z, color, glowFactor) {
    const pointsLayer = document.getElementById('coord-points-layer');
    if (!pointsLayer) {
        return;
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const clampedX = clamp(x, -5, 5);
    const clampedY = clamp(y, -2, 2);
    const clampedZ = clamp(z, 0, 20);
    const clampedGlow = clamp(glowFactor, 0, 1);

    const originX = 210;
    const originY = 95;

    // Projection vectors derived from the currently drawn cube.
    const xAxisHalfRangeVec = {x: 225, y: 0};     // x=-5..5 spans the back wall width
    const yAxisHalfRangeVec = {x: 0, y: -135};    // y=-2..2 spans the back wall height
    const zAxisFullRangeVec = {x: -120, y: 105};  // z=0..20 spans from back wall center to front wall center

    const normalizedX = clampedX / 5;
    const normalizedY = clampedY / 2;
    const normalizedZ = clampedZ / 20;

    const projectedX = originX
        + normalizedX * xAxisHalfRangeVec.x
        + normalizedY * yAxisHalfRangeVec.x
        + normalizedZ * zAxisFullRangeVec.x;
    const projectedY = originY
        + normalizedX * xAxisHalfRangeVec.y
        + normalizedY * yAxisHalfRangeVec.y
        + normalizedZ * zAxisFullRangeVec.y;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', projectedX.toString());
    circle.setAttribute('cy', projectedY.toString());
    circle.setAttribute('r', '10'); // 5px diameter
    circle.setAttribute('fill', color);
    if (glowFactor > 0.666) {
        circle.setAttribute('filter', 'url(#glow-100)');
    } else if (glowFactor > 0.333) {
        circle.setAttribute('filter', 'url(#glow-66)');
    } else if (glowFactor > 0.05) {
        circle.setAttribute('filter', 'url(#glow-33)');
    }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute("x1", "210");
    line.setAttribute("y1", "95");
    line.setAttribute("x2", projectedX.toString());
    line.setAttribute("y2", projectedY.toString());
    line.setAttribute("stroke", "rgba(196, 196, 196, 0.5)");
    line.setAttribute("stroke-width", "1");

    pointsLayer.appendChild(line);
    pointsLayer.appendChild(circle);
}

const app = new ConnectorApp();
window.addEventListener('load', () => {
    checkSerialIsAvailableInTheBrowser(app);
});

