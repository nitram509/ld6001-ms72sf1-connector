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
 * @typedef {Object} TargetData
 * @property {number} targetId Target ID, unique ID for each target, 0~255
 * @property {number} distance Target distance d (0.0-25.5m)
 * @property {number} distanceInMeter Target distance in meter
 * @property {number} pitchAngle Target pitch angle θ (0~180 degrees)
 * @property {number} horizAngle Target horizontal angle ∂ (0~180 degrees)
 * @property {number} x Target X coordinate value, signed char type, unit
 * @property {number} y Target Y coordinate value, signed char type, unit
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
 * @typedef {Object} SensorDataResponse
 * @property {number} noOfTargets The number of detected targets is M (the maximum value)
 * @property {number} faultStatus Millimeter wave module fault status, 0 means no fault,
 * @property {TargetData[]} targets individual target data information
 */

export class Ld6001Connector {

    /**
     * @param {function(SensorDataResponse)} onDataReceived callback function to be called when new data is received
     * @param {function(SensorVersion)} onVersionReceived callback function to be called when version information is received
     */
    constructor(onDataReceived, onVersionReceived) {
        this.buffer = new RingBuffer(MAX_BUF_SIZE);
        this.onDataReceived = onDataReceived;
        this.onVersionReceived = onVersionReceived;
    }

    reset() {
        this.buffer.clear();
    }

    /**
     * Will use the callback functions provided in the constructor to handle data received from the sensor
     * @param {Uint8Array} data
     * @returns {boolean} true if data was complete frame, false when incomplete
     */
    parse(data) {
        for (let i = 0; i < data.length; i++) {
            this.buffer.push(data[i]);
        }

        console.log("buffer size: " + this.buffer.size());

        let isSensorDataFrame =
            this.buffer.size() >= 12 + 2 && // shortest possible frame with no targets
            this.buffer.get(0) === 0x4D &&
            this.buffer.get(1) === 0x62 &&
            (this.buffer.get(2) % 8) === 0 &&
            this.buffer.get(3) === 0;

        if (isSensorDataFrame) {
            const payloadLen = this.buffer.get(2);
            const frameLen = 4 + payloadLen + 2;
            isSensorDataFrame = isSensorDataFrame && frameLen <= this.buffer.size();
            if (!isSensorDataFrame) {
                console.log("frame length mismatch, expected min. " + frameLen + " , got " + this.buffer.size());
                return false;
            }

            // TODO disabled, because does not work reliable = sensor sends crappy data
            // const postAmble = this.buffer.get(frameLen - 1);
            // isSensorDataFrame = isSensorDataFrame && postAmble === 0x4a; // post-amble
            // if (!isSensorDataFrame) {
            //     console.log("post-amble mismatch, expected 74 (0x4a) , got " + postAmble);
            //     this.buffer.popFront(frameLen); // drop the mismatching frame
            //     return false;
            // }

            // TODO disabled, because does not work reliable = sensor sends crappy data
            // const checksumExpected = this.calculateChecksum(this.buffer, frameLen);
            // const checksumActual = this.buffer.get(frameLen - 2);
            // isSensorDataFrame = checksumExpected === checksumActual;
            // if (!isSensorDataFrame) {
            //     console.log("checksum mismatch, expected " + checksumExpected + ", got " + checksumActual);
            //     return false
            // }

            const faultStatus = this.buffer.get(4);
            const noOfTargets = this.buffer.get(5);
            const targets = [];
            for (let i = 0; i < noOfTargets; i++) {
                // starting with byte offset 12, the first target begins
                const targetId = this.buffer.get(12 + i * 8);
                const distance = this.buffer.get(13 + i * 8);
                const distanceInMeter = 3 / 4 * 25.5 * this.buffer.get(13 + i * 8) / 255; // magic figure 3/4 x 25.5m guessed by me
                const pitchAngle = this.buffer.get(14 + i * 8);
                const horizAngle = this.buffer.get(15 + i * 8);
                const x = this.buffer.get(18 + i * 8);
                const y = this.buffer.get(19 + i * 8);
                targets.push({
                    targetId,
                    distance,
                    distanceInMeter,
                    pitchAngle,
                    horizAngle,
                    x,
                    y,
                })
            }
            this.buffer.popFront(frameLen);
            if (this.onDataReceived) {
                const sensorDataResponse = {
                    noOfTargets,
                    faultStatus,
                    targets,
                };
                this.onDataReceived(sensorDataResponse);
            }
        }

        let isVersionFrame =
            this.buffer.get(0) === 0x4D &&
            this.buffer.get(1) === 0x11 &&
            this.buffer.get(2) === 0x08;
        // checksum is broken on version response ...
        // I got [77, 17, 8, 0, 9, 1, 2, 1, 33, 0, 1, 16, 42, 233], which does not match the checksum
        // this.buffer.get(RX_VERSION_SIZE - 2) === this.calculateChecksum(this.buffer, RX_VERSION_SIZE);

        if (isVersionFrame) {
            isVersionFrame = isVersionFrame && this.buffer.get(RX_VERSION_SIZE - 1) === 0xE9; // post-amble, observed from my module, does not match the documentation!
            if (!isVersionFrame) {
                console.log("post-amble mismatch, expected 0xE9, got " + this.buffer.get(RX_VERSION_SIZE - 1));
                return false;
            }

            const sensorVersion = {
                softwareMinorVersion: this.buffer.get(4),
                softwareMajorVersion: this.buffer.get(5),
                hardwareMinorVersion: this.buffer.get(6),
                hardwareMajorVersion: this.buffer.get(7),
                sensorStatus: this.buffer.get(9),
            };
            this.buffer.popFront(RX_VERSION_SIZE);
            if (this.onVersionReceived) {
                this.onVersionReceived(sensorVersion);
            }
        }
        if (this.buffer.size() > 200) {
            // FIXME: bad hack ... sometimes the buffer os overfilled
            this.buffer.clear();
        }
        return isSensorDataFrame || isVersionFrame;
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

