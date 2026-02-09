export async function copyTextToClipboard(
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!text) {
    return { ok: false, error: 'Text is empty.' };
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
  const body = document.body;
  if (!body) {
    return { ok: false, error: 'Document not ready.' };
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  body.appendChild(textarea);
  textarea.select();
  try {
    const ok = document.execCommand('copy');
    return ok ? { ok: true } : { ok: false, error: 'Copy failed.' };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  } finally {
    textarea.remove();
  }
}
