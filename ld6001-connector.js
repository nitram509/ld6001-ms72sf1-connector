'use strict';

import {RingBuffer} from './ld6001-ringbuffer.js';
export const RX_HEADER = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
export const MAX_BUF_SIZE = 4096;

function bytesToUint32(buffer, offset) {
  return (buffer.get(offset + 0) |
      (buffer.get(offset + 1) << 8) |
      (buffer.get(offset + 2) << 16) |
      (buffer.get(offset + 3) << 24)) >>> 0;
}

function bytesToFloat32(buffer, offset) {
  const bytes = new Uint8Array([
    buffer.get(offset + 0),
    buffer.get(offset + 1),
    buffer.get(offset + 2),
    buffer.get(offset + 3)
  ]);
  return new Float32Array(bytes.buffer)[0];
}

/**
 * @param {RingBuffer} buffer
 * @param {number} offset
 * @returns {SensorData}
 */
function bytes2SensorData(buffer, offset) {
  const id = bytesToUint32(buffer, offset);
  const q = bytesToUint32(buffer, offset + 4);
  const x = bytesToFloat32(buffer, offset + 8) * 1000;
  const y = bytesToFloat32(buffer, offset + 12) * 1000;
  const z = bytesToFloat32(buffer, offset + 16) * 1000;
  const vx = bytesToFloat32(buffer, offset + 20);
  const vy = bytesToFloat32(buffer, offset + 24);
  const vz = bytesToFloat32(buffer, offset + 28);

  return {
    objectId: id,
    q,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    valid: true
  };
}

export class Ld6001Connector {
  constructor() {
    this.buffer = new RingBuffer(MAX_BUF_SIZE);
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
   * @property {boolean} valid
   */

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

        // We have a full frame
        // Field breakdown:
        // HEAD (8 bytes)
        // LENGTH (4 bytes) - Offset 8
        // FRAME (4 bytes) - Offset 12 // frame count
        // TLVs=1 (4 bytes) - Offset 16
        // POINTLENTH (4 bytes) - Offset 20
        // TLVs=2 (4 bytes) - Offset 24
        // TRACKLENTH (4 bytes) - Offset 28
        // Personnel data (N * 32 bytes) - Offset 32

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

