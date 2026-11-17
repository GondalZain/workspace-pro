export function readImageFileAsDataUrl(event: Event): Promise<string | null> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      input.value = '';
      resolve(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      input.value = '';
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}
