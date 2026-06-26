const PREFIX = "homekeeper:draft:";

export function readFormDraft(key) {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading form draft:", error);
    return null;
  }
}

export function writeFormDraft(key, data) {
  if (!key) return;
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving form draft:", error);
  }
}

export function clearFormDraft(key) {
  if (!key) return;
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch (error) {
    console.error("Error clearing form draft:", error);
  }
}

/** Keep only fields safe to restore after refresh (no blob previews). */
export function imagesForDraft(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img) => img?.path || img?.src)
    .map((img) => ({
      id: img.id,
      name: img.name,
      path: img.path,
      src: img.src,
    }));
}

export function documentsForDraft(documents) {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((doc) => doc?.path)
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      path: doc.path,
      mimeType: doc.mimeType,
    }));
}
