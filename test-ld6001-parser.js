import {Ld6001Parser} from './ld6001-parser.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function testLd6001Parser() {
    const parser = new Ld6001Parser();

    // Bytes from "example bytes to describe a data frame.png"
    const bytes = new Uint8Array([
        // Header (8 bytes)
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        // Total Length (4 bytes) - 0x40 = 64
        0x40, 0x00, 0x00, 0x00,
        // Frame count (4 bytes) - 0x01A3 = 419
        0xA3, 0x01, 0x00, 0x00,
        // TLV=1 (4 bytes)
        0x01, 0x00, 0x00, 0x00,
        // Always zero (4 bytes)
        0x00, 0x00, 0x00, 0x00,
        // TLV=2 (4 bytes)
        0x02, 0x00, 0x00, 0x00,
        // Track length (4 bytes) - 0x20 = 32 (1 person)
        0x20, 0x00, 0x00, 0x00,
        // Personnel Data (32 bytes)
        // objectId (4 bytes) - "Personnel zero"
        0x00, 0x00, 0x00, 0x00,
        // q (4 bytes) - "reserve"
        0x00, 0x00, 0x00, 0x00,
        // x, y, z (3 * 4 bytes)
        0x21, 0x28, 0x96, 0xBF,
        0x72, 0x6F, 0x81, 0xBF,
        0xCB, 0x85, 0x20, 0x40,
        // vx, vy, vz (3 * 4 bytes)
        0x8A, 0xBD, 0xC1, 0x3D,
        0x50, 0x98, 0x99, 0xBD,
        0x40, 0x52, 0xC3, 0x3A
    ]);

    const results = parser.parse(bytes);

    console.log('Parsed sensor data:', JSON.stringify(results, null, 2));

    assert(results.length === 1, `Should find 1 person, got ${results.length}`);
    const p = results[0];
    assert(p.objectId === 0, `objectId should be 0, got ${p.objectId}`);

    // Note: Float32 representation can vary slightly.
    // The image text description says: x=-1.17, y=2.50, z=0.31
    // However, the byte values in the image tell a different story (maybe some were swapped or misinterpreted in the text):
    // 21 28 96 BF -> x: -1.173
    // 72 6F 81 BF -> y: -1.011
    // CB 85 20 40 -> z: 2.508167

    assert(Math.abs(p.x - (-1.173)) < 0.001, `x mismatch: ${p.x}`);
    assert(Math.abs(p.y - (-1.011)) < 0.001, `y mismatch: ${p.y}`);
    assert(Math.abs(p.z - (2.508167)) < 0.001, `z mismatch: ${p.z}`);

    // Speed: vx=0.094, vy=-0.074, vz=0.001
    assert(Math.abs(p.vx - 0.094) < 0.001, `vx mismatch: ${p.vx}`);
    assert(Math.abs(p.vy - (-0.074)) < 0.001, `vy mismatch: ${p.vy}`);
    assert(Math.abs(p.vz - 0.001) < 0.001, `vz mismatch: ${p.vz}`);
}

try {
    testLd6001Parser();
    console.log('Example bytes test passed (check values above)!');
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}
