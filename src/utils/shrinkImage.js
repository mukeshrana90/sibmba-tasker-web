/**
 * Prepare files before an upload (12 Nov client report: "Save equipment" failed
 * on a phone with a network error).
 *
 * - Photos bigger than SHRINK_OVER_BYTES are redrawn at most MAX_SIDE px on the
 *   long side as JPEG, so a truck with many phone photos is a few MB, not 50+.
 * - Every file is read into memory first. On Android a picked photo can become
 *   unreadable before Save; reading it here turns that into a clear message
 *   instead of a browser "Network Error".
 * - Files the browser can't draw (PDF, Word, iPhone HEIC on most browsers) are
 *   sent as they are; the server still converts HEIC.
 */
const MAX_SIDE = 1600;
const QUALITY = 0.82;
const SHRINK_OVER_BYTES = 900 * 1024;

export class UnreadableFileError extends Error {
  constructor(name) {
    super(`"${name || "A file"}" can't be read any more. Please pick it again and save.`);
    this.code = "FILE_UNREADABLE";
  }
}

const isDrawableImage = (file) => /^image\/(jpe?g|png|webp)$/i.test(file?.type || "");

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

async function shrink(file, buffer) {
  const img = await loadImage(new Blob([buffer], { type: file.type }));
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // PNG transparency → white, not black, in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob || blob.size >= file.size) return null;
  const base = (file.name || "photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

/** Returns a ready-to-send copy of one file. Throws UnreadableFileError. */
export async function prepareUploadFile(file) {
  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new UnreadableFileError(file?.name);
  }
  if (isDrawableImage(file) && file.size > SHRINK_OVER_BYTES) {
    try {
      const small = await shrink(file, buffer);
      if (small) return small;
    } catch {
      /* keep the original */
    }
  }
  return new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
}

/** New FormData with every file prepared; other fields copied in order. */
export async function prepareFormData(fd) {
  if (typeof FormData === "undefined" || !(fd instanceof FormData)) return fd;
  const entries = [...fd.entries()];
  if (!entries.some(([, v]) => v instanceof File)) return fd;
  const out = new FormData();
  for (const [key, value] of entries) {
    if (value instanceof File) {
      const ready = await prepareUploadFile(value);
      out.append(key, ready, ready.name);
    } else {
      out.append(key, value);
    }
  }
  return out;
}
