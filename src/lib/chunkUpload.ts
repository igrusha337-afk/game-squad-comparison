/** Читает часть файла и возвращает её в виде base64-строки (без data: префикса). */
function readChunkAsBase64(file: File, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',', 2)[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file.slice(start, end));
  });
}

/**
 * Загружает файл частями (по умолчанию ~1.5 МБ на кусок), чтобы уложиться в лимит
 * размера тела запроса облачной функции. uploadChunk вызывается для каждой части
 * по очереди (последовательно, чтобы не перегружать сервер параллельными запросами).
 */
export async function uploadFileInChunks(
  file: File,
  uploadChunk: (chunkBase64: string, chunkIndex: number) => Promise<void>,
  chunkSize = 1.5 * 1024 * 1024,
): Promise<void> {
  const totalChunks = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const base64 = await readChunkAsBase64(file, start, end);
    await uploadChunk(base64, i);
  }
}
