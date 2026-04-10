/**
 * Client-side utility to optimize and compress images using HTML5 Canvas.
 * Supports resizing to a maximum dimension and converting to WebP for optimal size/quality.
 */

interface OptimizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/webp' | 'image/jpeg';
}

/**
 * Compresses an image file and returns a Blob.
 */
export async function optimizeImage(
    file: File,
    options: OptimizeOptions = {}
): Promise<Blob> {
    const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.8,
        format = 'image/webp'
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if dimensions exceed limits
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Export to Blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    format,
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Converts a Blob to a File.
 */
export function blobToFile(blob: Blob, originalFileName: string): File {
    const extension = blob.type.split('/')[1];
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
    const fileName = `${baseName}_optimized.${extension}`;
    return new File([blob], fileName, { type: blob.type });
}
