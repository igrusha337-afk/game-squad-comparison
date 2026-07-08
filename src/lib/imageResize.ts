/**
 * Сжимает изображение на клиенте перед загрузкой, чтобы уложиться в лимит
 * размера запроса (телефонные фото часто весят 8-15 МБ и после base64
 * превышают допустимый размер тела запроса облачной функции).
 */
export function resizeImageToBase64(
  file: File,
  maxDimension = 1920,
  quality = 0.85,
  maxBytes = 4 * 1024 * 1024,
): Promise<{ data: string; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('Не удалось обработать изображение'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas недоступен')); return; }
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' && file.size < maxBytes ? 'image/png' : 'image/jpeg';

        let q = quality;
        const tryExport = () => {
          const data = canvas.toDataURL(outputType, q);
          const approxBytes = Math.ceil((data.length - data.indexOf(',') - 1) * 0.75);
          if (approxBytes > maxBytes && q > 0.4) {
            q -= 0.15;
            tryExport();
          } else {
            resolve({ data, type: outputType });
          }
        };
        tryExport();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
