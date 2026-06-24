const DRAFT_KEY = "postTaskDraft";
const DB_NAME = "simbatasker_drafts";
const STORE_NAME = "postTaskImages";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearImages() {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore storage errors
  }
}

async function saveImage(index, file) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(file, `img_${index}`);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadImage(index) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const request = tx.objectStore(STORE_NAME).get(`img_${index}`);
  const file = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
}

function normalizeDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return "";
}

export function hasPostTaskDraft() {
  return Boolean(sessionStorage.getItem(DRAFT_KEY));
}

export async function savePostTaskDraft(values, imageFiles = []) {
  const draft = {
    need_done: values.need_done || "",
    details: values.details || "",
    when_done: normalizeDate(values.when_done),
    budget: values.budget || "",
    task_time: values.task_time || "",
    address: values.address || "",
    lat: values.lat || "",
    long: values.long || "",
    category_id: values.category_id || "",
    imageCount: imageFiles.length,
  };

  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  await clearImages();

  const files = Array.isArray(imageFiles) ? imageFiles : [];
  await Promise.all(files.map((file, index) => saveImage(index, file)));
}

export async function loadPostTaskDraft() {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw);
    const images = [];
    const count = draft.imageCount || 0;

    for (let i = 0; i < count; i++) {
      const file = await loadImage(i);
      if (file) images.push(file);
    }

    return {
      need_done: draft.need_done || "",
      details: draft.details || "",
      when_done: draft.when_done || "",
      budget: draft.budget || "",
      task_time: draft.task_time || "",
      address: draft.address || "",
      lat: draft.lat || "",
      long: draft.long || "",
      category_id: draft.category_id || "",
      images,
    };
  } catch {
    return null;
  }
}

export async function clearPostTaskDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
  await clearImages();
}
