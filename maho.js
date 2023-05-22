import fs from 'node:fs/promises';
class BufferReader {
    constructor(buffer) {
        this.i = 0;
        this.buffer = buffer;
    }
    readInt8() {
        const read = this.buffer.readInt8(this.i);
        this.i += 8 / 8;
        return read;
    }
    readInt16() {
        const read = this.buffer.readInt16LE(this.i);
        this.i += 16 / 8;
        return read;
    }
    readInt32() {
        const read = this.buffer.readInt32LE(this.i);
        this.i += 32 / 8;
        return read;
    }
    readUInt8() {
        const read = this.buffer.readUInt8(this.i);
        this.i += 8 / 8;
        return read;
    }
    readUInt16() {
        const read = this.buffer.readUInt16LE(this.i);
        this.i += 16 / 8;
        return read;
    }
    readUInt32() {
        const read = this.buffer.readUInt32LE(this.i);
        this.i += 32 / 8;
        return read;
    }
    readString(size) {
        const read = this.buffer.subarray(this.i, this.i + size).toString();
        this.i += size;
        return read;
    }
    read(schemaValue) {
        const type = schemaValue.type;
        const size = schemaValue.size;
        switch (type) {
            case String:
                return this.readString(size);
            case Number:
                switch (size) {
                    case 8:
                        return this.readInt8();
                    case 16:
                        return this.readInt16();
                    case 32:
                        return this.readInt32();
                    case -8:
                        return this.readUInt8();
                    case -16:
                        return this.readUInt16();
                    case -32:
                        return this.readUInt32();
                }
        }
    }
}
class BufferWriter {
    constructor(buffer) {
        this.i = 0;
        this.buffer = buffer;
    }
    writeInt8(value) {
        this.buffer.writeInt8(value, this.i);
        this.i += 8 / 8;
    }
    writeInt16(value) {
        this.buffer.writeInt16LE(value, this.i);
        this.i += 16 / 8;
    }
    writeInt32(value) {
        this.buffer.writeInt32LE(value, this.i);
        this.i += 32 / 8;
    }
    writeUInt8(value) {
        this.buffer.writeUint8(value, this.i);
        this.i += 8 / 8;
    }
    writeUInt16(value) {
        this.buffer.writeUInt16LE(value, this.i);
        this.i += 16 / 8;
    }
    writeUInt32(value) {
        this.buffer.writeUInt32LE(value, this.i);
        this.i += 32 / 8;
    }
    writeString(value, size) {
        this.buffer.write(value);
        this.i += size;
    }
    write(value, schemaValue) {
        const type = schemaValue.type;
        const size = schemaValue.size;
        switch (type) {
            case String:
                return this.writeString(value, size);
            case Number:
                switch (size) {
                    case 8:
                        return this.writeInt8(value);
                    case 16:
                        return this.writeInt16(value);
                    case 32:
                        return this.writeInt32(value);
                    case -8:
                        return this.writeUInt8(value);
                    case -16:
                        return this.writeUInt16(value);
                    case -32:
                        return this.writeUInt32(value);
                }
        }
    }
}
export class Database {
    constructor() {
        this._objects = [];
        this.schemaSize = 0;
    }
    async init(path = './db.db', schema) {
        this.schema = schema;
        try {
            this.fd = await fs.open(path, "r+", 0o666);
        }
        catch (_a) {
            await fs.writeFile(path, "");
            this.fd = await fs.open(path, "r+", 0o666);
        }
        const file = await this.fd.readFile();
        this.entries = Object.entries(schema);
        this.schemaSize = this.entries.map(([k, v]) => Math.abs(v.type == Number ? v.size / 8 : v.size)).reduce((a, b) => a + b, 0);
        const reader = new BufferReader(file);
        while (reader.i < file.length) {
            let object = {};
            this.entries.forEach(([k, v]) => {
                const read = reader.read(v);
                if (read === undefined)
                    throw new Error(`Couldn't read key ${k}`);
                object[k] = read;
            });
            this._objects.push(object);
        }
    }
    get(index) {
        return this._objects[index];
    }
    get objects() {
        return this._objects;
    }
    async set(index, newObject, write = true) {
        if (!this.fd || !this.entries || !this.schema)
            throw new Error("set before init");
        this._objects[index] = Object.assign(this._objects[index] || {}, newObject);
        if (!write)
            return;
        const buffer = Buffer.alloc(this.schemaSize);
        const writer = new BufferWriter(buffer);
        this.entries.forEach(([k, v]) => {
            if (this._objects[index][k] !== undefined)
                writer.write(this._objects[index][k], v);
            else
                throw new Error(`Key ${k} not in object`);
        });
        await this.fd.write(buffer, 0, this.schemaSize, this.schemaSize * index);
    }
    async push(newObject, write = true) {
        return this.set(this._objects.length, newObject, write);
    }
    async pop(write = true) {
        if (!this.fd)
            throw new Error("pop before init");
        if (write)
            await this.fd.truncate(this.schemaSize * (this._objects.length - 1));
        return this._objects.pop();
    }
}
