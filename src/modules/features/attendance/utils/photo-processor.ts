/**
 * Attendance Photo Processor
 * Optimized for mobile: WebP compression + Metadata Overlay (Burn-in)
 */

interface PhotoMetadata {
    timestamp: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    staffName: string;
}

export async function processAttendancePhoto(
    dataUrl: string,
    metadata: PhotoMetadata
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // 1. Optimize Dimensions (max 800px height for evidence)
            const maxH = 800;
            let width = img.width;
            let height = img.height;

            if (height > maxH) {
                width = Math.round((width * maxH) / height);
                height = maxH;
            }

            canvas.width = width;
            canvas.height = height;

            // 2. Draw Image
            ctx.drawImage(img, 0, 0, width, height);

            // 3. Burn-in Metadata Overlay
            const overlayHeight = 60;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Suble dark overlay
            ctx.fillRect(0, height - overlayHeight, width, overlayHeight);

            // Text Styles
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Inter, system-ui, sans-serif';
            ctx.textBaseline = 'middle';

            const padding = 15;
            const line1 = `${metadata.staffName} | ${metadata.timestamp}`;
            const line2 = `GPS: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)} (±${Math.round(metadata.accuracy)}m)`;

            ctx.fillText(line1, padding, height - (overlayHeight / 2) - 10);
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(line2, padding, height - (overlayHeight / 2) + 8);

            // 4. Export as WebP with High Compression (0.6)
            const optimizedDataUrl = canvas.toDataURL('image/webp', 0.6);
            resolve(optimizedDataUrl);
        };
        img.onerror = (err) => reject(err);
    });
}
