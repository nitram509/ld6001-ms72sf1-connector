export class RingBuffer {
    constructor(capacity) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new RangeError('capacity must be a positive integer');
        }
        this.capacity = capacity;
        this.data = new Uint8Array(capacity + 1);
        this.head = 0;
        this.count = 0;
    }

    push(byte) {
        if (this.count === this.capacity) {
            this.popFront();
        }
        const next = (this.head + this.count) % (this.capacity + 1);
        this.data[next] = byte;
        this.count++;
    }

    popFront() {
        if (this.count === 0) {
            return;
        }
        this.head = (this.head + 1) % (this.capacity + 1);
        this.count--;
    }

    size() {
        return this.count;
    }

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
