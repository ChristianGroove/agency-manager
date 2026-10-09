/** Guard the upload boundary against relabelled WebM recordings. Meta does not transcode them. */
export function assertWhatsAppAudioFormat(buffer: ArrayBuffer, mimeType: string) {
    const bytes = new Uint8Array(buffer)
    const signature = (start: number, length: number) => new TextDecoder().decode(bytes.slice(start, start + length))
    if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
        throw new Error('Convierte la grabación WebM a OGG/Opus antes de enviarla por WhatsApp')
    }
    if (mimeType === 'audio/ogg') {
        const payloadStart = 27 + (bytes[26] || 0)
        if (signature(0, 4) !== 'OggS' || bytes[26] === 0 || signature(payloadStart, 8) !== 'OpusHead') {
            throw new Error('WhatsApp requiere un archivo OGG con audio Opus válido')
        }
    } else if (mimeType === 'audio/mp4' && signature(4, 4) !== 'ftyp') {
        throw new Error('El archivo de audio no es un contenedor MP4 válido')
    } else if (!['audio/aac', 'audio/amr', 'audio/mpeg', 'audio/mp4'].includes(mimeType)) {
        throw new Error('Formato de audio no compatible con WhatsApp')
    }
}
