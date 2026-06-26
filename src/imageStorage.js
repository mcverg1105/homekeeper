import { supabase } from "./supabase";

const BUCKET = "images";
const SIGNED_URL_TTL = 3600;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIDE_PX = 2400;
const COMPRESS_START_QUALITY = 0.85;
const MIN_COMPRESS_QUALITY = 0.5;

const EXTENSION_TO_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function normalizeImageMimeType(mimeType) {
  if (!mimeType) return null;
  if (mimeType === "image/jpg") return "image/jpeg";
  if (ALLOWED_IMAGE_TYPES.has(mimeType)) return mimeType;
  return null;
}

export function resolveImageMimeType(file) {
  if (!file) return null;
  const fromType = normalizeImageMimeType(file.type);
  if (fromType) return fromType;

  const ext = file.name?.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_TO_MIME[ext]) return EXTENSION_TO_MIME[ext];

  return null;
}

function extensionForType(mimeType) {
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  return "bin";
}

export function newImageId() {
  return "img" + Math.random().toString(36).slice(2, 9);
}

export function validateImageFile(file) {
  const mimeType = resolveImageMimeType(file);
  if (!mimeType) {
    console.error("Invalid image file type:", file?.type, file?.name);
    return false;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    console.error("Image file too large (max 5 MB):", file.name);
    return false;
  }
  return true;
}

export function imageUploadErrorMessage(file, storageError) {
  if (!resolveImageMimeType(file)) {
    return "Unsupported photo format. Use JPG, PNG, or WebP.";
  }
  const message = storageError?.message || "";
  if (/mime|content type|allowed/i.test(message)) {
    return "Photo type blocked by storage settings. In Supabase, allow image/jpeg, image/png, and image/webp on the images bucket.";
  }
  return "Could not upload photo. Try again or use a different file.";
}

function compressedFileName(originalName) {
  const baseName = (originalName || "photo").replace(/\.[^.]+$/, "") || "photo";
  return `${baseName}.jpg`;
}

function loadImageElement(file) {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressImageFile(file) {
  const mimeType = resolveImageMimeType(file);
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return {
      error: "This iPhone photo format cannot be resized here. Open it in Photos and export/save as JPG, then upload again.",
    };
  }

  let image;
  try {
    image = await loadImageElement(file);
  } catch (error) {
    console.error("Error decoding image for compression:", error);
    return { error: "Could not read this photo. Try saving it as JPG and upload again." };
  }

  let maxSide = MAX_IMAGE_SIDE_PX;
  let quality = COMPRESS_START_QUALITY;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { error: "Could not resize this photo in your browser." };
    }
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_IMAGE_BYTES) {
      return new File([blob], compressedFileName(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }

    maxSide = Math.round(maxSide * 0.75);
    quality = Math.max(MIN_COMPRESS_QUALITY, quality - 0.08);
  }

  return {
    error: "Photo is still too large after resizing. Crop it or export a smaller copy before uploading.",
  };
}

/** Resize/compress large photos in the browser before upload. */
export async function prepareImageForUpload(file) {
  const mimeType = resolveImageMimeType(file);
  if (!mimeType) {
    return { error: imageUploadErrorMessage(file, null) };
  }
  if (file.size <= MAX_IMAGE_BYTES) {
    return { file, compressed: false };
  }

  const compressed = await compressImageFile(file);
  if (compressed?.error) return { error: compressed.error };
  return { file: compressed, compressed: true };
}

export async function uploadImage(file, folder) {
  const prepared = await prepareImageForUpload(file);
  if (prepared.error) {
    console.error("Image prepare failed:", prepared.error);
    return { error: prepared.error };
  }

  file = prepared.file;
  const mimeType = resolveImageMimeType(file);
  if (!mimeType) {
    return { error: imageUploadErrorMessage(file, null) };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error getting user for image upload:", userError);
    return { error: "Could not upload photo. Sign in again and retry." };
  }

  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${extensionForType(mimeType)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    console.error("Error uploading image:", error);
    return { error: imageUploadErrorMessage(file, error) };
  }

  return {
    id: newImageId(),
    path,
    name: file.name,
    compressed: prepared.compressed,
  };
}

export async function deleteStorageImage(path) {
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("Error deleting image from storage:", error);
}

export async function deleteStorageImages(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;

  const { error } = await supabase.storage.from(BUCKET).remove(unique);
  if (error) console.error("Error deleting images from storage:", error);
}

export async function getSignedImageUrl(path) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

/** Persist only stable fields — never save base64 src or signed URLs. */
export function imageForDb(image) {
  if (!image) return null;
  if (image.path) {
    return { id: image.id, name: image.name, path: image.path };
  }
  if (image.src) {
    return { id: image.id, name: image.name, src: image.src };
  }
  return null;
}

export function imagesForDb(images) {
  if (!Array.isArray(images)) return [];
  return images.map(imageForDb).filter(Boolean);
}

export function expenseForDb(expense) {
  if (!expense) return expense;
  return { ...expense, receipt: imageForDb(expense.receipt) };
}

export function expensesForDb(expenses) {
  if (!Array.isArray(expenses)) return [];
  return expenses.map(expenseForDb);
}

export function collectImagePathsFromExpenses(expenses) {
  if (!Array.isArray(expenses)) return [];
  return expenses.map((e) => e.receipt?.path).filter(Boolean);
}

export function collectImagePaths(images) {
  if (!Array.isArray(images)) return [];
  return images.map((img) => img?.path).filter(Boolean);
}

export function collectImagePathsFromHome(home) {
  if (!home) return [];

  const paths = [];
  if (home.image?.path) paths.push(home.image.path);

  for (const task of home.tasks || []) {
    paths.push(...collectImagePaths(task.images));
    paths.push(...collectImagePaths(task.documents));
    for (const entry of task.completionHistory || []) {
      paths.push(...collectImagePaths(entry.images));
      paths.push(...collectImagePathsFromExpenses(entry.expenses));
    }
  }

  for (const project of home.projects || []) {
    paths.push(...collectImagePaths(project.images));
    paths.push(...collectImagePaths(project.documents));
    paths.push(...collectImagePathsFromExpenses(project.expenses));
  }

  for (const warranty of home.warranties || []) {
    paths.push(...collectImagePaths(warranty.images));
    paths.push(...collectImagePaths(warranty.documents));
  }

  return paths;
}
