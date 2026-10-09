/** Remux MediaRecorder's WebM/Opus packets into Ogg without re-encoding audio. */
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
    let crc = i << 24
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x80000000 ? (crc << 1) ^ 0x04c11db7 : crc << 1
    CRC_TABLE[i] = crc >>> 0
}

function readVint(data: Uint8Array, offset: number, keepMarker = false) {
    const first = data[offset]
    if (!first) throw new Error('Grabación WebM inválida o incompleta')
    const length = 8 - Math.floor(Math.log2(first))
    if (offset + length > data.length) throw new Error('Grabación WebM incompleta')
    let value = keepMarker ? first : first & (0xff >> length)
    let unknown = !keepMarker && value === (0xff >> length)
    for (let i = 1; i < length; i++) {
        value = value * 256 + data[offset + i]
        unknown = unknown && data[offset + i] === 255
    }
    if (!unknown && !Number.isSafeInteger(value)) throw new Error('Tamaño WebM inválido')
    return { value, length, unknown }
}

interface Element { id: number; start: number; end: number }
function elements(data: Uint8Array, start: number, end: number): Element[] {
    const result: Element[] = []
    for (let offset = start; offset < end;) {
        const id = readVint(data, offset, true)
        const size = readVint(data, offset + id.length)
        const contentStart = offset + id.length + size.length
        const contentEnd = size.unknown ? end : contentStart + size.value
        if (contentStart > end || contentEnd > end) throw new Error('Grabación WebM incompleta')
        result.push({ id: id.value, start: contentStart, end: contentEnd })
        offset = contentEnd
    }
    return result
}

function uint(data: Uint8Array) {
    return data.reduce((value, byte) => value * 256 + byte, 0)
}

/** Matroska blocks can contain several packets. Never truncate packets at 255 bytes. */
function blockPackets(block: Uint8Array, trackNumber: number): Uint8Array[] {
    const track = readVint(block, 0)
    if (track.value !== trackNumber) return []
    let offset = track.length + 3 // track, signed timestamp, flags
    if (offset >= block.length) throw new Error('Bloque de audio vacío')
    const lacing = (block[offset - 1] >> 1) & 3
    if (!lacing) return [block.slice(offset)]
    const count = block[offset++] + 1
    const sizes: number[] = []
    if (lacing === 2) {
        const size = (block.length - offset) / count
        if (!Number.isInteger(size)) throw new Error('Bloque de audio inválido')
        sizes.push(...Array<number>(count).fill(size))
    } else {
        for (let i = 0; i < count - 1; i++) {
            let size = 0
            if (lacing === 1) {
                let byte: number
                do {
                    if (offset >= block.length) throw new Error('Bloque de audio incompleto')
                    byte = block[offset++]
                    size += byte
                } while (byte === 255)
            } else {
                const value = readVint(block, offset)
                offset += value.length
                size = i === 0 ? value.value : sizes[i - 1] + value.value - (2 ** (7 * value.length - 1) - 1)
            }
            sizes.push(size)
        }
        sizes.push(block.length - offset - sizes.reduce((sum, size) => sum + size, 0))
    }
    return sizes.map(size => {
        if (size <= 0 || offset + size > block.length) throw new Error('Bloque de audio inválido')
        const packet = block.slice(offset, offset + size)
        offset += size
        return packet
    })
}

/** Opus TOC defines duration at the Ogg clock rate of 48 kHz (RFC 6716). */
function packetSamples(packet: Uint8Array) {
    const config = packet[0] >> 3
    const frameSamples = config >= 16 ? 120 * 2 ** (config & 3)
        : config >= 12 ? 480 * 2 ** (config & 1)
            : (config & 3) === 3 ? 2880 : 480 * 2 ** (config & 3)
    const code = packet[0] & 3
    const frames = code === 0 ? 1 : code === 3 ? (packet[1] || 0) & 63 : 2
    const samples = frames * frameSamples
    if (!samples || samples > 5760) throw new Error('Paquete Opus inválido')
    return samples
}

function oggPage(packet: Uint8Array, flags: number, granule: number, serial: number, sequence: number) {
    const segments = Math.floor(packet.length / 255) + 1
    if (segments > 255) throw new Error('Paquete Opus demasiado grande')
    const page = new Uint8Array(27 + segments + packet.length)
    const view = new DataView(page.buffer)
    page.set([0x4f, 0x67, 0x67, 0x53])
    page[5] = flags
    view.setBigUint64(6, BigInt(granule), true)
    view.setUint32(14, serial, true)
    view.setUint32(18, sequence, true)
    page[26] = segments
    page.fill(255, 27, 27 + segments - 1)
    page[27 + segments - 1] = packet.length % 255
    page.set(packet, 27 + segments)
    let crc = 0
    for (const byte of page) crc = (crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ byte) & 255]
    view.setUint32(22, crc >>> 0, true)
    return page
}

export async function convertWebmToOgg(webmBlob: Blob): Promise<Blob> {
    const data = new Uint8Array(await webmBlob.arrayBuffer())
    const roots = elements(data, 0, data.length)
    const segment = roots.find(element => element.id === 0x18538067)
    if (!segment || roots[0]?.id !== 0x1a45dfa3) throw new Error('La grabación no es WebM/Opus')
    const children = elements(data, segment.start, segment.end)
    const tracks = children.find(element => element.id === 0x1654ae6b)
    if (!tracks) throw new Error('La grabación no contiene pistas de audio')
    let trackNumber = 0
    let opusHead: Uint8Array | undefined
    for (const track of elements(data, tracks.start, tracks.end).filter(element => element.id === 0xae)) {
        const fields = elements(data, track.start, track.end)
        const codec = fields.find(element => element.id === 0x86)
        if (!codec || new TextDecoder().decode(data.slice(codec.start, codec.end)) !== 'A_OPUS') continue
        const number = fields.find(element => element.id === 0xd7)
        const privateData = fields.find(element => element.id === 0x63a2)
        if (number && privateData) {
            trackNumber = uint(data.slice(number.start, number.end))
            opusHead = data.slice(privateData.start, privateData.end)
            break
        }
    }
    if (!trackNumber || !opusHead || opusHead.length < 19
        || new TextDecoder().decode(opusHead.slice(0, 8)) !== 'OpusHead') {
        throw new Error('La grabación no contiene audio Opus válido')
    }
    const packets: Uint8Array[] = []
    function collectCluster(cluster: Element) {
        for (const element of elements(data, cluster.start, cluster.end)) {
            // A streaming WebM cluster may have unknown length and contain later clusters.
            if (element.id === 0x1f43b675) collectCluster(element)
            if (element.id === 0xa3) packets.push(...blockPackets(data.slice(element.start, element.end), trackNumber))
            if (element.id === 0xa0) {
                for (const block of elements(data, element.start, element.end).filter(item => item.id === 0xa1)) {
                    packets.push(...blockPackets(data.slice(block.start, block.end), trackNumber))
                }
            }
        }
    }
    for (const cluster of children.filter(element => element.id === 0x1f43b675)) collectCluster(cluster)
    if (!packets.length) throw new Error('La grabación no contiene paquetes de audio')
    const vendor = new TextEncoder().encode('Pixy')
    const tags = new Uint8Array(16 + vendor.length)
    tags.set(new TextEncoder().encode('OpusTags'))
    new DataView(tags.buffer).setUint32(8, vendor.length, true)
    tags.set(vendor, 12)
    const serial = crypto.getRandomValues(new Uint32Array(1))[0]
    const pages = [oggPage(opusHead, 2, 0, serial, 0), oggPage(tags, 0, 0, serial, 1)]
    let granule = 0
    for (let i = 0; i < packets.length; i++) {
        granule += packetSamples(packets[i])
        pages.push(oggPage(packets[i], i === packets.length - 1 ? 4 : 0, granule, serial, i + 2))
    }
    return new Blob(pages as BlobPart[], { type: 'audio/ogg;codecs=opus' })
}
