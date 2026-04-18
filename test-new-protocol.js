import { Ld6001Connector } from './ld6001-connector.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testNewProtocolParser() {
  const parser = new Ld6001Connector();

  // Create a buffer for a frame with 2 persons
  const frameHeader = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const frameNum = new Uint32Array([123]);
  const tlvs1 = new Uint32Array([1]);
  const pointlenth = new Uint32Array([0]);
  const tlvs2 = new Uint32Array([2]);
  const tracklenth = new Uint32Array([64]);

  const person1 = {
    id: 1,
    q: 100,
    x: 1.5,
    y: 2.5,
    z: 3.5,
    vx: 0.1,
    vy: 0.2,
    vz: 0.3
  };

  const person2 = {
    id: 2,
    q: 200,
    x: -1.5,
    y: -2.5,
    z: -3.5,
    vx: -0.1,
    vy: -0.2,
    vz: -0.3
  };

  const totalLength = 32 + (2 * 32);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  buffer.set(frameHeader, offset); offset += 8;
  buffer.set(new Uint8Array(new Uint32Array([totalLength]).buffer), offset); offset += 4;
  buffer.set(new Uint8Array(frameNum.buffer), offset); offset += 4;
  buffer.set(new Uint8Array(tlvs1.buffer), offset); offset += 4;
  buffer.set(new Uint8Array(pointlenth.buffer), offset); offset += 4;
  buffer.set(new Uint8Array(tlvs2.buffer), offset); offset += 4;
  buffer.set(new Uint8Array(tracklenth.buffer), offset); offset += 4;

  const writePerson = (p, off) => {
    const u32 = new Uint32Array([p.id, p.q]);
    const f32 = new Float32Array([p.x, p.y, p.z, p.vx, p.vy, p.vz]);
    buffer.set(new Uint8Array(u32.buffer), off);
    buffer.set(new Uint8Array(f32.buffer), off + 8);
  };

  writePerson(person1, offset); offset += 32;
  writePerson(person2, offset); offset += 32;

  const results = parser.parse(buffer);

  console.log('Results length:', results.length);
  assert(results.length === 2, `Should find 2 persons, got ${results.length}`);

  const checkPerson = (res, expected) => {
    assert(res.objectId === expected.id, `ID mismatch: got ${res.objectId}, expected ${expected.id}`);
    assert(Math.abs(res.x - expected.x) < 0.001, `X mismatch: got ${res.x}, expected ${expected.x}`);
    assert(Math.abs(res.y - expected.y) < 0.001, `Y mismatch: got ${res.y}, expected ${expected.y}`);
    assert(Math.abs(res.z - expected.z) < 0.001, `Z mismatch: got ${res.z}, expected ${expected.z}`);
    assert(Math.abs(res.vx - expected.vx) < 0.001, `VX mismatch: got ${res.vx}, expected ${expected.vx}`);
    assert(Math.abs(res.vy - expected.vy) < 0.001, `VY mismatch: got ${res.vy}, expected ${expected.vy}`);
    assert(Math.abs(res.vz - expected.vz) < 0.001, `VZ mismatch: got ${res.vz}, expected ${expected.vz}`);
  };

  checkPerson(results[0], person1);
  checkPerson(results[1], person2);

  console.log('New protocol tests passed!');
}

try {
    testNewProtocolParser();
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}
