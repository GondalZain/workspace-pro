/**
 * Universal client-side image compression and file optimization utility.
 * Downscales images via HTML Canvas before transmission, ensuring payloads
 * stay well within serverless gateway limits (e.g. Vercel 4.5MB) and load instantly.
 */

export interface OptimizeImageOptions {
  maxDimension?: number;
  quality?: number;
  forceJpeg?: boolean;
}

export interface OptimizedImageResult {
  file: File;
  dataUrl: string;
  size: number;
}

/**
 * Compresses and downscales an image file using an offscreen canvas.
 * Preserves aspect ratio, reduces byte weight by up to 90%, and outputs a clean Data URL & File.
 */
export async function optimizeImageFile(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  const maxDim = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.85;

  // Non-raster images or SVG: pass through without canvas compression
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    const dataUrl = await readFileAsRawDataUrl(file);
    return {
      file,
      dataUrl,
      size: file.size
    };
  }

  return new Promise((resolve) => {
    const rawUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(rawUrl);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback if 2d context unavailable
        readFileAsRawDataUrl(file).then((dataUrl) => {
          resolve({ file, dataUrl, size: file.size });
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output mime
      const isPngWithTransparency = file.type === 'image/png' && !options.forceJpeg;
      const outputMime = isPngWithTransparency ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(outputMime, quality);

      // Approximate byte size from base64
      const commaIdx = dataUrl.indexOf(',');
      const base64Content = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
      const byteLength = Math.round((base64Content.length * 3) / 4);

      // Generate replacement File object for multipart FormData uploads
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, dataUrl, size: byteLength });
            return;
          }
          const extension = outputMime === 'image/jpeg' ? '.jpg' : '.png';
          const newName = file.name.replace(/\.[^.]+$/, '') + extension;
          const compressedFile = new File([blob], newName, { type: outputMime, lastModified: Date.now() });
          resolve({
            file: compressedFile,
            dataUrl,
            size: byteLength
          });
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(rawUrl);
      readFileAsRawDataUrl(file).then((dataUrl) => {
        resolve({ file, dataUrl, size: file.size });
      });
    };

    img.src = rawUrl;
  });
}

function readFileAsRawDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function readImageFileAsDataUrl(event: Event): Promise<string | null> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return Promise.resolve(null);

  return optimizeImageFile(file, { maxDimension: 1200, quality: 0.85 })
    .then((res) => {
      input.value = '';
      return res.dataUrl;
    })
    .catch(() => {
      input.value = '';
      return null;
    });
}
