'use strict';

import {RingBuffer} from './ringbuffer.js';

const RX_HEADER = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
const MAX_BUF_SIZE = 4096;

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

export class Ld6001Parser {
    constructor() {
        this.buffer = new RingBuffer(MAX_BUF_SIZE);
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

        while (this.buffer.size() >= RX_HEADER.length + 4) {
            // Data fields breakdown:
            // HEAD (8 bytes)                - Offset 0
            // LENGTH (4 bytes)              - Offset 8
            // FRAME_COUNT (4 bytes)         - Offset 12
            // TLVs=1 (4 bytes)              - Offset 16
            // POINT_LENGTH (4 bytes)        - Offset 20
            // TLVs=2 (4 bytes)              - Offset 24
            // TRACK_LENGTH (4 bytes)        - Offset 28
            // Personnel_Data (N * 32 bytes) - Offset 32

            // Check for header
            let headerMatched = true;
            for (let i = 0; i < RX_HEADER.length; i++) {
                if (this.buffer.get(i) !== RX_HEADER[i]) {
                    headerMatched = false;
                    break;
                }
            }

            if (headerMatched) {
                const frameLength = bytesToUint32(this.buffer, RX_HEADER.length);
                if (this.buffer.size() < frameLength) {
                    break; // Wait for more data
                }

                const trackLength = bytesToUint32(this.buffer, 28);
                const numPersons = trackLength / 32;
                let offset = 32;

                for (let i = 0; i < numPersons; i++) {
                    const sd = bytes2SensorData(this.buffer, offset);
                    detectedObjects.push(sd);
                    offset += 32;
                }

                for (let i = 0; i < frameLength; i++) {
                    this.buffer.popFront();
                }
            } else {
                this.buffer.popFront();
            }
        }

        return detectedObjects;
    }
}

