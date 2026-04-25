'use strict';

export class RingBuffer {
    /**
     * @param {number} capacity
     */
    constructor(capacity) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new RangeError('capacity must be a positive integer');
        }
        this.capacity = capacity;
        this.data = new Uint8Array(capacity + 1);
        this.head = 0;
        this.count = 0;
    }

    /**
     * Adds a new element to the buffer.
     * If the buffer is full, the oldest element is removed.
     * @param {number} byte
     */
    push(byte) {
        if (this.count === this.capacity) {
            this.popFront();
        }
        const next = (this.head + this.count) % (this.capacity + 1);
        this.data[next] = byte;
        this.count++;
    }

    /**
     * Removes the first element from the buffer.
     * If the buffer is empty, this method does nothing.
     */
    popFront() {
        if (this.count === 0) {
            return;
        }
        this.head = (this.head + 1) % (this.capacity + 1);
        this.count--;
    }

    /**
     * @returns {number}
     */
    size() {
        return this.count;
    }

    /**
     * @param index
     * @returns {undefined|number}
     */
    get(index) {
        if (index < 0 || index >= this.count) {
            return undefined;
        }
        const physicalIndex = (this.head + index) % (this.capacity + 1);
        return this.data[physicalIndex];
    }

    clear() {
        this.head = 0;
        this.count = 0;
    }
}

export default RingBuffer;
