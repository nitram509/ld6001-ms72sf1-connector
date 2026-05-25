import {Ld6001Connector} from "./ld6001-connector.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function testLd6001GetVersion() {
    let sensorResponse = [77, 17, 8, 0, 9, 1, 2, 1, 33, 0, 1, 16, 42, 233]
    let parser = new Ld6001Connector();
    let actual = parser.parseVersion(sensorResponse);

    assert(actual.softwareMinorVersion === 9, `softwareMinorVersion mismatch"`);
    assert(actual.softwareMajorVersion === 1, `softwareMinorVersion mismatch"`);
    assert(actual.hardwareMinorVersion === 2, `softwareMinorVersion mismatch"`);
    assert(actual.hardwareMajorVersion === 1, `softwareMinorVersion mismatch"`);
    assert(actual.sensorStatus === 0, `sensorStatus mismatch"`);
}

try {
    testLd6001GetVersion();
    console.log('Example bytes test passed (check values above)!');
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}
