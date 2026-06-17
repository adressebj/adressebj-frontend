import { api } from '@/lib/api';

const MAX_BYTES = 5 * 1024 * 1024;
const MOCK_UPLOAD_DELAY_MS = 1500;

const isMockMode = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadPortalPhoto(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error('La photo ne doit pas dépasser 5 Mo.');
  }

  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_UPLOAD_DELAY_MS));
    // Read the actual file as a data URL so the address record persists the
    // image the user really picked — blob: URLs get revoked the moment the
    // form unmounts. A real backend would return a Cloudinary URL instead.
    return await fileToDataUrl(file);
  }

  const { signature, timestamp, apiKey, cloudName, folder, transformation } =
    await api.uploadSignature();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', apiKey);
  formData.append('folder', folder);
  formData.append('transformation', transformation);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!res.ok) {
    throw new Error("Échec de l'envoi de la photo. Réessayez.");
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
