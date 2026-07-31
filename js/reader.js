class SCReader {

    constructor(buffer) {
        this.view = new DataView(buffer);
        this.offset = 0;
    }

    seek(position) {
        this.offset = position;
    }

    skip(bytes) {
        this.offset += bytes;
    }

    tell() {
        return this.offset;
    }

    eof() {
        return this.offset >= this.view.byteLength;
    }

    readUInt8() {
        return this.view.getUint8(this.offset++);
    }

    readInt8() {
        return this.view.getInt8(this.offset++);
    }

    readUInt16() {
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readInt16() {
        const value = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readUInt32() {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readInt32() {
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readFloat32() {
        const value = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readBytes(length) {
        const bytes = new Uint8Array(
            this.view.buffer,
            this.offset,
            length
        );

        this.offset += length;

        return bytes;
    }
}
