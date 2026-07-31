class SCUnpacker {

    static unpack(buffer) {

        const reader = new SCReader(buffer);

        const magic = reader.readUInt16();

        if (magic !== 0x5343) {
            throw new Error("Wrong SC magic");
        }

        let version = reader.readUInt32();

        if (version === 4)
            version = reader.readUInt32();

        if (version > 4)
            version = SCUnpacker.reverse32(version);

        return {

            version,

            offset: reader.tell(),

            buffer

        };

    }

    static reverse32(value){

        return (
            ((value & 0xFF) << 24) |
            ((value & 0xFF00) << 8) |
            ((value >>> 8) & 0xFF00) |
            ((value >>> 24) & 0xFF)
        ) >>> 0;

    }

}