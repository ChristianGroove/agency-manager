/**
 * Ultimate Surgical WebM (Opus) to OGG (Opus) transcoder.
 * Version 4: Mono, 48kHz, Minimalist (No OpusTags, 1 packet per page for first 10 pages).
 */

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) {
        r = (r & 0x80000000) ? (r << 1) ^ 0x04C11DB7 : (r << 1);
    }
    CRC_TABLE[i] = r;
}

function calcOggCrc(data: Uint8Array): number {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
        crc = (crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ data[i]) & 0xff];
    }
    return crc >>> 0;
}

export async function convertWebmToOgg(webmBlob: Blob): Promise<Blob> {
    const buffer = await webmBlob.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    const opusPackets: Uint8Array[] = [];
    let pos = 0;
    
    function readVint(buf: Uint8Array, start: number) {
        const firstByte = buf[start];
        if (firstByte === undefined || firstByte === 0) return null;
        const length = 8 - Math.floor(Math.log2(firstByte));
        let value = firstByte & (0xFF >> length);
        for (let i = 1; i < length; i++) {
            value = (value << 8) | buf[start + i];
        }
        return { value, length };
    }

    while (pos < data.length) {
        const id = readVint(data, pos);
        if (!id) break;
        pos += id.length;
        const size = readVint(data, pos);
        if (!size) break;
        pos += size.length;

        if (id.value === 0xA3) { // SimpleBlock
            const blockData = data.slice(pos, pos + size.value);
            const track = readVint(blockData, 0);
            if (track) {
                const packet = blockData.slice(track.length + 3);
                if (packet.length > 0) opusPackets.push(packet);
            }
        }
        if (id.value === 0x1F43B675 || id.value === 0x18538067 || id.value === 0x1654AE6B || id.value === 0x1C53BB6B) {
            // Traverse containers
        } else {
            pos += size.value;
        }
    }

    if (opusPackets.length === 0) return webmBlob;

    const oggPages: Uint8Array[] = [];
    let granulePos = 0;
    let seqNum = 0;
    const serial = Math.floor(Math.random() * 0x7FFFFFFF);

    function createOggPage(packets: Uint8Array[], flags = 0, isAudio = true) {
        const segments = packets.length;
        const pageHeader = new Uint8Array(27 + segments);
        const view = new DataView(pageHeader.buffer);
        
        pageHeader.set([0x4F, 0x67, 0x67, 0x53], 0); // "OggS"
        pageHeader[4] = 0; // version
        pageHeader[5] = flags;
        
        if (isAudio) {
             granulePos += packets.length * 960;
        }

        view.setBigUint64(6, BigInt(granulePos), true);
        view.setUint32(14, serial, true);
        view.setUint32(18, seqNum++, true);
        pageHeader[26] = segments;
        
        const payloadLength = packets.reduce((a, b) => a + b.length, 0);
        const fullPage = new Uint8Array(27 + segments + payloadLength);
        fullPage.set(pageHeader, 0);
        
        let offset = 27;
        let pOffset = 27 + segments;
        for (const p of packets) {
            fullPage[offset++] = Math.min(p.length, 255);
            fullPage.set(p.slice(0, 255), pOffset);
            pOffset += Math.min(p.length, 255);
        }

        new DataView(fullPage.buffer).setUint32(22, 0); // Clear CRC field
        new DataView(fullPage.buffer).setUint32(22, calcOggCrc(fullPage), true);
        return fullPage;
    }

    // OpusHead: Mono, 48kHz.
    const idHeader = new Uint8Array([
        0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64,
        0x01, 0x01, 0x00, 0x00, 0x80, 0xBB, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    // OpusTags: Required by WhatsApp/Meta strict parsers
    const tagsHeader = new Uint8Array([
        0x4F, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73, // "OpusTags"
        0x08, 0x00, 0x00, 0x00, // Vendor string length (8)
        0x50, 0x69, 0x78, 0x79, 0x41, 0x70, 0x70, 0x00, // "PixyApp\0"
        0x00, 0x00, 0x00, 0x00  // Comment count (0)
    ]);

    oggPages.push(createOggPage([idHeader], 0x02, false)); // BOS
    oggPages.push(createOggPage([tagsHeader], 0x00, false)); // OpusTags mandatory second page


    // Send packets (WhatsApp sometimes prefers 1-10 packets per page for better streaming)
    for (let i = 0; i < opusPackets.length; i += 20) {
        const chunk = opusPackets.slice(i, i + 20);
        const isLast = i + 20 >= opusPackets.length;
        oggPages.push(createOggPage(chunk, isLast ? 0x04 : 0x00, true));
    }

    return new Blob(oggPages as any, { type: 'audio/ogg; codecs=opus' });
}
