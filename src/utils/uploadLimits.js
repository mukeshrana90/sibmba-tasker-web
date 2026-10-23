import { toast } from "react-toastify";

// Same rules as the backend (middleware/logisticsUpload.js): only images
// (incl. iPhone HEIC/HEIF), PDF and Word files, each up to the server limit —
// backend .env LOGISTICS_UPLOAD_MAX_MB, sent in GET /logistics/session
// config.upload.max_file_mb (useLogisticsConfig calls setUploadLimitMb).
export const MAX_UPLOAD_MB = 10; // default until the session config loads
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

let limitMb = MAX_UPLOAD_MB;

export function setUploadLimitMb(mb) {
  const n = Number(mb);
  if (Number.isFinite(n) && n > 0) limitMb = n;
}

export function getUploadLimitMb() {
  return limitMb;
}

export const PHOTO_ACCEPT = "image/*,.heic,.heif";
export const DOC_ACCEPT = ".pdf,image/*,.heic,.heif";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"]);
const DOCUMENT_EXTS = new Set(["pdf", "doc", "docx"]);

function fileExt(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ""));
  return m ? m[1].toLowerCase() : "";
}

/**
 * Error message for one file, or null when it may be uploaded.
 * imagesOnly: photo pickers (no PDF / Word).
 */
export function uploadFileError(file, { imagesOnly = false } = {}) {
  if (!file) return null;
  const ext = fileExt(file.name);
  const isImage = ext ? IMAGE_EXTS.has(ext) : String(file.type || "").startsWith("image/");
  if (imagesOnly && !isImage) {
    return `${file.name}: photos must be images (JPG, PNG or iPhone HEIC)`;
  }
  if (!isImage && !DOCUMENT_EXTS.has(ext)) {
    return `${file.name}: only images, PDF or Word files are allowed`;
  }
  if (file.size > Math.floor(limitMb * 1024 * 1024)) {
    return `${file.name} is larger than ${limitMb} MB`;
  }
  return null;
}

/**
 * Files from an <input type="file"> that pass the upload rules; a toast is
 * shown for each one left out.
 */
export function keepAllowedFiles(fileList, options) {
  const kept = [];
  for (const file of Array.from(fileList || [])) {
    const err = uploadFileError(file, options);
    if (err) toast.error(err);
    else kept.push(file);
  }
  return kept;
}
