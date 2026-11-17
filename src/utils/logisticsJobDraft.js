/**
 * Guest "Post a job" draft: the form stays in this tab's sessionStorage and the
 * photos in IndexedDB until the guest signs in (same approach as postTaskDraft).
 */
const DRAFT_KEY = "logisticsJobDraft";
const DB_NAME = "simbatasker_logistics_drafts";
const STORE_NAME = "jobImages";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, work) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const result = work(tx.objectStore(STORE_NAME));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

/** Shown when an owner / operator signs in with a guest job draft open (they can't post jobs). */
export const SUPPLY_DRAFT_MESSAGE =
  "Equipment owner and operator accounts can't post this job. Sign in with a customer account to post it.";

export function hasLogisticsJobDraft() {
  try {
    return Boolean(sessionStorage.getItem(DRAFT_KEY));
  } catch {
    return false;
  }
}

export async function saveLogisticsJobDraft(form, imageFiles = [], returnImageFiles = []) {
  await withStore("readwrite", (store) => {
    store.clear();
    store.put(imageFiles, "images");
    store.put(returnImageFiles, "return_images");
  });
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
}

export async function loadLogisticsJobDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const form = JSON.parse(raw);
    let images;
    let returnImages;
    await withStore("readonly", (store) => {
      images = store.get("images");
      returnImages = store.get("return_images");
    });
    return {
      form,
      images: images.result || [],
      returnImages: returnImages.result || [],
    };
  } catch {
    return null;
  }
}

export async function clearLogisticsJobDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
    await withStore("readwrite", (store) => store.clear());
  } catch {
    // ignore storage errors
  }
}
