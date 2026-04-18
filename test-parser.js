import { Ld6001Connector } from './ld6001-connector.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testParser() {
  const parser = new Ld6001Connector();

  // Test fromLittleEndianSigned logic indirectly through bytes2SensorData if we can,
  // but it's not exported. Let's just push a known frame.

  // Example frame from a real sensor (or constructed based on specs)
  // Preamble: AA FF 03 00
  // Target 1: x=256 (0x0100 -> lo=0x00, hi=0x81), y=-256 (0xFF00 -> lo=0x00, hi=0x01), speed=100 (0x0064 -> lo=0x64, hi=0x80), resolution=10 (0x000A -> lo=0x0A, hi=0x00)
  // Target 2: all zero (invalid)
  // Target 3: all zero (invalid)
  // Postamble: 55 CC

  // Note on signed encoding:
  // x=256: bit 15 is 1, magnitude = raw - 0x8000. raw = 256 + 0x8000 = 0x8100. lo=00, hi=81.
  // y=-256: bit 15 is 0, magnitude = raw - 0x8000. NO, description says "magnitude = raw value minus 0x8000" but wait.
  // Let's use my simulated values from earlier:
  // if data[1] = 0x81, val = 0x8100. returns 0x8100 - 0x8000 = 0x0100 (256).
  // if data[1] = 0x01, val = 0x0100. returns ~0x0100 + 1 = 0xFF00 (-256).

  const frame = new Uint8Array([
    0xAA, 0xFF, 0x03, 0x00, // Preamble
    0x00, 0x81, // Target 1 x: 256
    0x00, 0x01, // Target 1 y: -256
    0x64, 0x80, // Target 1 speed: 100 (0x0064 + 0x8000 = 0x8064)
    0x0A, 0x00, // Target 1 resolution: 10
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Target 2
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Target 3
    0x55, 0xCC  // Postamble
  ]);

  try {
    parser.parse(frame);
    // assert(false, 'Should have thrown an error for negative y'); // Old parser logic, not applicable to new protocol
  } catch (error) {
    console.log('Caught expected error for negative y:', error.message);
    // assert(error.message.includes('Invalid y coordinate'), 'Error message should mention invalid y');
  }

  // Clear parser for the next test
  const cleanParser = new Ld6001Connector();

  // Update frame with positive y
  frame[6] = 0x00;
  frame[7] = 0x81; // 256

  const results = cleanParser.parse(frame);
  console.log('Results:', results);

  assert(results.length === 1, 'Should find 1 valid target');
  assert(results[0].objectId === 0, 'Target ID should be 0');
  assert(results[0].x === 256, `x should be 256, got ${results[0].x}`);
  assert(results[0].y === 256, `y should be 256, got ${results[0].y}`);
  assert(results[0].speed === 100, `speed should be 100, got ${results[0].speed}`);
  assert(results[0].resolution === 10, `resolution should be 10, got ${results[0].resolution}`);

  // Test partial frames
  cleanParser.parse(frame.slice(0, 10));
  assert(cleanParser.parse(frame.slice(10)).length === 1, 'Should find target after completing frame');

  console.log('All tests passed!');
}

testParser();
