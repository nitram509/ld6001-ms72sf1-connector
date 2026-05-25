'use strict';

import {RingBuffer} from './ringbuffer.js';

const RX_HEADER = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
const MAX_BUF_SIZE = 4096;
const RX_VERSION_SIZE = 14;

/**
 * @param {RingBuffer} ringBuffer
 * @param offset
 * @returns {number}
 */
function bytesToUint32(ringBuffer, offset) {
    return (ringBuffer.get(offset + 0) |
        (ringBuffer.get(offset + 1) << 8) |
        (ringBuffer.get(offset + 2) << 16) |
        (ringBuffer.get(offset + 3) << 24)) >>> 0;
}

/**
 * @param {RingBuffer} ringBuffer
 * @param offset
 * @returns {number}
 */
function bytesToFloat32(ringBuffer, offset) {
    const a = new Uint8Array([
        ringBuffer.get(offset + 0),
        ringBuffer.get(offset + 1),
        ringBuffer.get(offset + 2),
        ringBuffer.get(offset + 3)
    ]).buffer;
    const dv = new DataView(a);
    return dv.getFloat32(0, true); // convert from Little Endian to platform endianness
}

/**
 * @typedef {Object} SensorData
 * @property {number} objectId
 * @property {number} q
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} vx
 * @property {number} vy
 * @property {number} vz
 */

/**
 * @typedef {Object} SensorVersion
 * @property {number} softwareMinorVersion
 * @property {number} softwareMajorVersion
 * @property {number} hardwareMinorVersion
 * @property {number} hardwareMajorVersion
 * @property {number} sensorStatus current working status, 0 = initialization completed, 1 = initializing
 */

/**
 * @param {RingBuffer} ringBuffer
 * @param {number} offset
 * @returns {SensorData}
 */
function bytes2SensorData(ringBuffer, offset) {
    const id = bytesToUint32(ringBuffer, offset);
    const q = bytesToUint32(ringBuffer, offset + 4);
    const x = bytesToFloat32(ringBuffer, offset + 8);
    const y = bytesToFloat32(ringBuffer, offset + 12);
    const z = bytesToFloat32(ringBuffer, offset + 16);
    const vx = bytesToFloat32(ringBuffer, offset + 20);
    const vy = bytesToFloat32(ringBuffer, offset + 24);
    const vz = bytesToFloat32(ringBuffer, offset + 28);

    return {
        objectId: id,
        q,
        x,
        y,
        z,
        vx,
        vy,
        vz
    };
}

export class Ld6001Connector {

    /**
     * @param {function(SensorData[])} onDataReceived callback function to be called when new data is received
     * @param {function(SensorVersion)} onVersionReceived callback function to be called when version information is received
     */
    constructor(onDataReceived, onVersionReceived) {
        this.buffer = new RingBuffer(MAX_BUF_SIZE);
        this.onDataReceived = onDataReceived;
        this.onVersionReceived = onVersionReceived;
    }

    /**
     * @param {Uint8Array} data
     * @returns {SensorData[]}
     */
    parse(data) {
        for (let i = 0; i < data.length; i++) {
            this.buffer.push(data[i]);
        }

        const detectedObjects = [];

        while (this.buffer.size() >= Math.min(RX_VERSION_SIZE)) {
            // Check for header
            let isVersionFrame =
                this.buffer.get(0) === 0x4D &&
                this.buffer.get(1) === 0x11 &&
                this.buffer.get(2) === 0x08;
            // checksum is broken on response ...
            // I got [77, 17, 8, 0, 9, 1, 2, 1, 33, 0, 1, 16, 42, 233], which does not match the checksum
            // this.buffer.get(RX_VERSION_SIZE - 2) === this.calculateChecksum(this.buffer, RX_VERSION_SIZE);

            if (isVersionFrame) {
                const v = {
                    softwareMinorVersion: this.buffer.get(4),
                    softwareMajorVersion: this.buffer.get(5),
                    hardwareMinorVersion: this.buffer.get(6),
                    hardwareMajorVersion: this.buffer.get(7),
                    sensorStatus: this.buffer.get(9),
                };
                this.buffer.popFront(RX_VERSION_SIZE);
                if (this.onVersionReceived) {
                    this.onVersionReceived(v);
                }
            } else {
                this.buffer.popFront();
            }
        }

        return detectedObjects;
    }

    /**
     * Does LD6001 checksum calculation and sets the right sum into the data array
     * @param {Uint8Array} data
     */
    calculateAndSetChecksum(data) {
        data[data.length - 2] = this.calculateChecksum(data, data.length);
    }

    /**
     * Does LD6001 checksum calculation
     * @param {Uint8Array, RingBuffer} data
     * @param {number} length length of the data frame, including checksum byte itselt + post-amble (mean incl. last two bytes)
     * @returns {number}
     */
    calculateChecksum(data, length) {
        let sum = 0;
        if (data instanceof Uint8Array) {
            if (length > data.length) {
                throw new Error("`data.length` is shorter than expected length");
            }
            for (let i = 0; i < length - 2; i++) {
                sum = (sum + data.at(i)) % 256;
            }
        } else {
            if (length > data.size()) {
                throw new Error("`data.size()` is shorter than expected length");
            }
            for (let i = 0; i < length - 2; i++) {
                sum = (sum + data.get(i)) % 256;
            }
        }
        return sum;
    }

    /**
     * @param bytes {Uint8Array}
     * @returns SensorVersion
     */
    parseVersion(bytes) {
        if (bytes.length !== RX_VERSION_SIZE) {
            throw new Error("wrong paket length, expected 14, got " + bytes.length);
        }
        // TODO check pre-amble, and checksum
        return {
            softwareMinorVersion: bytes[4],
            softwareMajorVersion: bytes[5],
            hardwareMinorVersion: bytes[6],
            hardwareMajorVersion: bytes[7],
            sensorStatus: bytes[9],
        }
    }

    /**
     * @returns {Uint8Array} command data to be sent
     */
    createVersionCommand() {
        const data = new Uint8Array(
            [0x44, // command
                0x11, // message ID
                0x00, // data length
                0x00, // reserved, 0x00
                0x00, // checksum, calculated later
                0x4b]);
        this.calculateAndSetChecksum(data);
        return data;
    }

    /**
     * @param {boolean} highSensitivity - Whether to use high-sensitivity mode, default is false
     * @returns {Uint8Array} command data to be sent
     */
    createSensorDataCommand(highSensitivity = false) {
        const data = new Uint8Array(
            [0x44, // command
                0x62, // message ID
                0x08, // data length
                0x00, // reserved, 0x00
                highSensitivity ? 0x20 : 0x10, // sensitivity (1), Sensitivity attribute, 0x10 normal sensitivity, 0x20 high sensitivity
                highSensitivity ? 0x20 : 0x10, // sensitivity (2)
                highSensitivity ? 0x20 : 0x10, // sensitivity (3)
                highSensitivity ? 0x20 : 0x10, // sensitivity (4)
                highSensitivity ? 0x20 : 0x10, // sensitivity (5)
                highSensitivity ? 0x20 : 0x10, // sensitivity (6)
                highSensitivity ? 0x20 : 0x10, // sensitivity (7)
                highSensitivity ? 0x20 : 0x10, // sensitivity (8)
                0x00, // checksum, calculated later
                0x4b]);
        this.calculateAndSetChecksum(data);
        return data;
    }
}

