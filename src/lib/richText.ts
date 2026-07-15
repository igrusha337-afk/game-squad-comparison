/**
 * Старые записи (гайды, форум) могли создаваться до появления RichEditor и хранятся
 * как обычный текст с переносами строк \n, без HTML-тегов. Новые записи содержат
 * готовую HTML-разметку. Эта функция приводит оба варианта к валидному HTML.
 */
export function textToHtml(content: string): string {
  if (!content) return content;
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return content.replace(/\n/g, '<br>');
}
