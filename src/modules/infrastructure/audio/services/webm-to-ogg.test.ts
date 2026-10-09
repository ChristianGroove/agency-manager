// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { convertWebmToOgg } from './webm-to-ogg'
import { assertWhatsAppAudioFormat } from './whatsapp-audio'
import chromeFixture from './fixtures/chrome-opus.json'

const concat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap(part => Array.from(part)))
function element(id: number[], body: Uint8Array, unknownSize = false) {
    const size = unknownSize ? [1, 255, 255, 255, 255, 255, 255, 255]
        : body.length < 127 ? [0x80 | body.length] : [0x40 | (body.length >> 8), body.length & 255]
    return concat(Uint8Array.from(id), Uint8Array.from(size), body)
}
const head = Uint8Array.from([...new TextEncoder().encode('OpusHead'), 1, 1, 56, 1, 128, 187, 0, 0, 0, 0, 0])
function recording(packets: Uint8Array[], unknownSize = false) {
    const track = element([0xae], concat(element([0xd7], Uint8Array.of(1)), element([0x86], new TextEncoder().encode('A_OPUS')), element([0x63, 0xa2], head)))
    const blocks = packets.map(packet => element([0xa3], concat(Uint8Array.of(0x81, 0, 0, 0x80), packet)))
    return new Blob([concat(element([0x1a, 0x45, 0xdf, 0xa3], new Uint8Array()), element([0x18, 0x53, 0x80, 0x67], concat(element([0x16, 0x54, 0xae, 0x6b], track), element([0x1f, 0x43, 0xb6, 0x75], concat(...blocks))), unknownSize))], { type: 'audio/webm' })
}
function pages(data: Uint8Array) {
    const result: { packet: Uint8Array; granule: bigint; flags: number; crc: number }[] = []
    for (let offset = 0; offset < data.length;) {
        expect(new TextDecoder().decode(data.slice(offset, offset + 4))).toBe('OggS')
        const segmentCount = data[offset + 26]
        const size = data.slice(offset + 27, offset + 27 + segmentCount).reduce((sum, n) => sum + n, 0)
        const end = offset + 27 + segmentCount + size
        const page = data.slice(offset, end)
        const view = new DataView(page.buffer)
        const crc = view.getUint32(22, true)
        view.setUint32(22, 0, true)
        let computed = 0
        for (const byte of page) {
            computed ^= byte << 24
            for (let bit = 0; bit < 8; bit++) computed = computed & 0x80000000 ? (computed << 1) ^ 0x04c11db7 : computed << 1
        }
        expect(computed >>> 0).toBe(crc)
        result.push({ packet: data.slice(offset + 27 + segmentCount, end), granule: view.getBigUint64(6, true), flags: page[5], crc })
        offset = end
    }
    return result
}

describe('WhatsApp WebM to Ogg boundary', () => {
    it('remuxes a real Chrome recording fixture into CRC-valid Ogg/Opus', async () => {
        const output = await convertWebmToOgg(new Blob([Buffer.from(chromeFixture.webmBase64, 'base64')], { type: 'audio/webm;codecs=opus' }))
        const buffer = await output.arrayBuffer()
        const parsed = pages(new Uint8Array(buffer))
        expect(parsed.length).toBeGreaterThan(10)
        expect(parsed[parsed.length - 1].flags).toBe(4)
        expect(Number(parsed[parsed.length - 1].granule) / 48000).toBeGreaterThan(chromeFixture.originalDuration - 0.15)
        expect(Number(parsed[parsed.length - 1].granule) / 48000).toBeLessThan(chromeFixture.originalDuration + 0.15)
        expect(() => assertWhatsAppAudioFormat(buffer, 'audio/ogg')).not.toThrow()
    })
    it.each([false, true])('preserves full Opus packets and headers with unknown segment size=%s', async unknownSize => {
        const longPacket = new Uint8Array(510).fill(42)
        longPacket[0] = 0xf8 // 20 ms Opus packet, two full 255-byte laces plus a terminating zero
        const shortPacket = Uint8Array.of(0x80, 255, 254) // 2.5 ms
        const output = await convertWebmToOgg(recording([longPacket, shortPacket], unknownSize))
        const buffer = await output.arrayBuffer()
        const parsed = pages(new Uint8Array(buffer))
        expect(parsed[0].packet).toEqual(head)
        expect(new TextDecoder().decode(parsed[1].packet.slice(0, 8))).toBe('OpusTags')
        expect(parsed[2].packet).toEqual(longPacket)
        expect(parsed[3].packet).toEqual(shortPacket)
        expect(parsed[2].granule).toBe(BigInt(960))
        expect(parsed[3].granule).toBe(BigInt(1080))
        expect(parsed[0].flags).toBe(2)
        expect(parsed[3].flags).toBe(4)
        expect(() => assertWhatsAppAudioFormat(buffer, 'audio/ogg')).not.toThrow()
    })
    it('rejects incomplete or non-Opus input instead of returning relabelled WebM', async () => {
        await expect(convertWebmToOgg(new Blob([Uint8Array.of(1, 2, 3)]))).rejects.toThrow()
        const input = await recording([Uint8Array.of(0xf8, 255, 254)]).arrayBuffer()
        await expect(convertWebmToOgg(new Blob([input.slice(0, -1)]))).rejects.toThrow()
        expect(() => assertWhatsAppAudioFormat(input, 'audio/mp4')).toThrow('WebM')
        expect(() => assertWhatsAppAudioFormat(input, 'audio/ogg')).toThrow('WebM')
        expect(() => assertWhatsAppAudioFormat(new ArrayBuffer(8), 'audio/ogg')).toThrow('Opus')
    })
})
