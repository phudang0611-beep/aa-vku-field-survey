import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function capturePhoto(): Promise<string> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt, // Allows taking new photo or picking from album
      quality: 75,
      width: 1024,
      correctOrientation: true
    });

    if (photo.base64String) {
      return `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`;
    }
    throw new Error('No image data returned from camera');
  } catch (error: any) {
    // If user cancelled, rethrow so UI can handle without error alert
    if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
      throw error;
    }
    console.warn('Native camera failed, falling back to Web File Picker:', error);
    return pickImageViaWebFallback();
  }
}

export function pickImageViaWebFallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Prefer rear camera on mobile browsers

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const compressedBase64 = await compressImageFile(file, 1024, 0.75);
        resolve(compressedBase64);
      } catch (err) {
        reject(err);
      }
    };

    input.oncancel = () => {
      reject(new Error('Cancelled'));
    };

    input.click();
  });
}

/**
 * Client-side image resizing and compression before storing into IndexedDB
 */
function compressImageFile(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
