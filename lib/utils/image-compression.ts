/**
 * lib/utils/image-compression.ts
 *
 * Browser-based client-side image compression and WebP conversion utility.
 * Resizes large image files (max 1600px dimension) and compresses them
 * into optimized WebP files in milliseconds before uploading to Supabase Storage.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImageInBrowser(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = options;

  // If file is not an image or is SVG, return original
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      // Calculate aspect ratio scale
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const compressedFile = new File([blob], cleanName, {
            type: "image/webp",
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for client-side compression"));
    };

    img.src = url;
  });
}
