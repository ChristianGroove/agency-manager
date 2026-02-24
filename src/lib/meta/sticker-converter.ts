/**
 * Client-side utility for transforming arbitrary images (PNG, JPG, GIF)
 * into WhatsApp-compliant stickers (512x512, transparent, <100KB, WebP).
 */
export async function convertToWhatsAppSticker(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()

        img.onload = () => {
            URL.revokeObjectURL(url)

            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Failed to get canvas context'))
                return
            }

            // Target dimensions are strictly 512x512
            canvas.width = 512
            canvas.height = 512

            // Calculate scaling to fit within 512x512 without distortion (contain format)
            const maxDim = Math.max(img.width, img.height)
            const scale = 512 / maxDim

            const scaledWidth = img.width * scale
            const scaledHeight = img.height * scale

            // Center the image within the 512x512 canvas
            const offsetX = (512 - scaledWidth) / 2
            const offsetY = (512 - scaledHeight) / 2

            // Clear the canvas completely transparent
            ctx.clearRect(0, 0, 512, 512)

            // Draw image scaled and centered
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

            // Attempt encoding to WebP
            let quality = 0.9

            const encodeIterate = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Blob conversion failed'))
                            return
                        }

                        // WhatsApp static sticker limit is 100KB (102400 bytes)
                        // If it's too big, reduce quality and try again
                        if (blob.size > 98 * 1024 && quality > 0.1) {
                            quality -= 0.1
                            encodeIterate()
                        } else {
                            // Perfect. Wrap resolving as File.
                            const stickerFile = new File([blob], `${file.name.split('.')[0]}_sticker.webp`, {
                                type: 'image/webp',
                                lastModified: Date.now()
                            })
                            resolve(stickerFile)
                        }
                    },
                    'image/webp',
                    quality
                )
            }

            encodeIterate()
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load image for sticker conversion'))
        }

        img.src = url
    })
}
