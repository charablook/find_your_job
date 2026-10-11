import sharp from "sharp";

export const PHOTO_MAX_INPUT_BYTES = 3 * 1024 * 1024;
const FORMATS_PERMIS = ["jpeg", "png", "webp"];

// Vérifie que c'est bien une image, la recadre en carré 800 px et la convertit en WebP.
// La ré-encodage supprime les métadonnées (position GPS, appareil, etc.).
export async function processPhoto(entree: Buffer): Promise<Buffer> {
  if (entree.length > PHOTO_MAX_INPUT_BYTES) {
    throw new Error("La photo ne doit pas dépasser 3 Mo.");
  }
  try {
    const meta = await sharp(entree).metadata();
    if (!meta.format || !FORMATS_PERMIS.includes(meta.format)) {
      throw new Error("format");
    }
    return await sharp(entree, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(800, 800, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error("La photo doit être une image JPEG, PNG ou WebP valide.");
  }
}
