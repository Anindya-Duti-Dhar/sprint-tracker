// Client-side avatar downscaling — runs entirely in the browser before
// upload so we never ship a multi-MB photo to the server. Crops to a square
// (cover-fit, like every other app's avatar picker) and re-encodes as a
// small JPEG, which keeps the eventual `profiles.avatar_url` data URI small
// enough to store directly in Postgres (no object storage is wired up in
// this deployment — see the avatar upload route for why).
const AVATAR_SIZE = 320;
const JPEG_QUALITY = 0.85;

export async function resizeImageToJpegBlob(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported in this browser.");

    // Cover-fit crop: scale so the shorter side fills AVATAR_SIZE, then
    // center-crop the overflow on the longer side.
    const scale = Math.max(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const dx = (AVATAR_SIZE - drawWidth) / 2;
    const dy = (AVATAR_SIZE - drawHeight) / 2;
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("Couldn't process that image.");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
    img.src = src;
  });
}
