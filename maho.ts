import fs, { FileHandle } from 'node:fs/promises';

export interface SchemaValue {
    type: StringConstructor | NumberConstructor,
    size: number
}

export interface Schema {
    [key: string]: SchemaValue
}

class BufferReader {
    private buffer: Buffer;
    public i: number = 0;
    constructor(buffer: Buffer) {
        this.buffer = buffer;
    }

    readInt8() {
        const read = this.buffer.readInt8(this.i);
        this.i += 8/8;
        return read;
    }

    readInt16() {
        const read = this.buffer.readInt16LE(this.i);
        this.i += 16/8;
        return read;
    }

    readInt32() {
        const read = this.buffer.readInt32LE(this.i);
        this.i += 32/8;
        return read;
    }

    readUInt8() {
        const read = this.buffer.readUInt8(this.i);
        this.i += 8/8;
        return read;
    }

    readUInt16() {
        const read = this.buffer.readUInt16LE(this.i);
        this.i += 16/8;
        return read;
    }

    readUInt32() {
        const read = this.buffer.readUInt32LE(this.i);
        this.i += 32/8;
        return read;
    }

    readString(size: number) {
        const read = this.buffer.subarray(this.i, this.i+size).toString()
        this.i += size;
        return read;
    }

    read(schemaValue: SchemaValue) { 
        const type = schemaValue.type;
        const size = schemaValue.size;
        switch(type) {
            case String:
                return this.readString(size);
            case Number:
                switch(size) {
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
    private buffer: Buffer;
    public i: number = 0;
    constructor(buffer: Buffer) {
        this.buffer = buffer;
    }

    writeInt8(value: number) {
        this.buffer.writeInt8(value, this.i);
        this.i += 8/8;
    }

    writeInt16(value: number) {
        this.buffer.writeInt16LE(value, this.i);
        this.i += 16/8;
    }

    writeInt32(value: number) {
        this.buffer.writeInt32LE(value, this.i);
        this.i += 32/8;
    }

    writeUInt8(value: number) {
        this.buffer.writeUint8(value, this.i);
        this.i += 8/8;
    }

    writeUInt16(value: number) {
        this.buffer.writeUInt16LE(value, this.i);
        this.i += 16/8;
    }

    writeUInt32(value: number) {
        this.buffer.writeUInt32LE(value, this.i);
        this.i += 32/8;
    }

    writeString(value: string, size: number) {
        this.buffer.write(value);
        this.i += size;
    }

    write(value: string | number, schemaValue: SchemaValue) { 
        const type = schemaValue.type;
        const size = schemaValue.size;
        switch(type) {
            case String:
                return this.writeString(value as string, size);
            case Number:
                switch(size) {
                    case 8:
                        return this.writeInt8(value as number);
                    case 16:
                        return this.writeInt16(value as number);
                    case 32:
                        return this.writeInt32(value as number);
                    case -8:
                        return this.writeUInt8(value as number);
                    case -16:
                        return this.writeUInt16(value as number);
                    case -32:
                        return this.writeUInt32(value as number);
                }
        }
    }
}

export interface DatabaseObject {
    [key: string]: number | string 
}

export class Database {
    private _objects: DatabaseObject[] = [];
    private schema?: Schema;
    private entries?: [string, SchemaValue][];
    private schemaSize: number = 0;
    private fd?: FileHandle;


    public async init(path='./db.db', schema: Schema) {
        this.schema = schema;
        
        try {
            this.fd = await fs.open(path, "r+", 0o666);
        } catch {
            await fs.writeFile(path, "");
            this.fd = await fs.open(path, "r+", 0o666);
        }

        const file = await this.fd.readFile();
        this.entries = Object.entries(schema);
        this.schemaSize = this.entries.map(([k, v]) => Math.abs(v.type == Number ? v.size/8 : v.size)).reduce((a, b) => a+b, 0);
        const reader = new BufferReader(file);

        while(reader.i < file.length) {
            let object: DatabaseObject = {};
            this.entries.forEach(([k, v]) => {
                const read = reader.read(v);
                if(read === undefined) throw new Error(`Couldn't read key ${k}`)
                object[k] = read;
            })
            this._objects.push(object);
        }
    }

    public get(index: number): DatabaseObject {
        return this._objects[index];
    }

    get objects() {
        return this._objects;
    }

    public async set(index: number, newObject: DatabaseObject, write=true) {
        if(!this.fd || !this.entries || !this.schema) throw new Error("set before init");
        this._objects[index] = newObject;

        if(!write) return;
        
        const buffer = Buffer.alloc(this.schemaSize);
        const writer = new BufferWriter(buffer);
        
        this.entries.forEach(([k, v]) => {
            if(newObject[k] !== undefined) writer.write(newObject[k], v);
            else throw new Error(`Key ${k} not in object`)
        })

        await this.fd.write(buffer, 0, this.schemaSize, this.schemaSize*index)
    }

    public async push(newObject: DatabaseObject, write=true) {
        return this.set(this._objects.length, newObject, write);
    }
    
    public async pop(write=true) {
        if(!this.fd) throw new Error("pop before init");
        if(write) await this.fd.truncate(this.schemaSize*(this._objects.length-1));
        return this._objects.pop();
    }
}