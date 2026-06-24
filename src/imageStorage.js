import { supabase } from "./supabase";

const BUCKET = "images";
const SIGNED_URL_TTL = 3600;

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function extensionForType(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

export function newImageId() {
  return "img" + Math.random().toString(36).slice(2, 9);
}

export function validateImageFile(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    console.error("Invalid image file type:", file?.type);
    return false;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    console.error("Image file too large (max 5 MB):", file.name);
    return false;
  }
  return true;
}

export async function uploadImage(file, folder) {
  if (!validateImageFile(file)) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error getting user for image upload:", userError);
    return null;
  }

  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${extensionForType(file.type)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("Error uploading image:", error);
    return null;
  }

  return { id: newImageId(), path, name: file.name };
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
    for (const entry of task.completionHistory || []) {
      paths.push(...collectImagePaths(entry.images));
      paths.push(...collectImagePathsFromExpenses(entry.expenses));
    }
  }

  for (const project of home.projects || []) {
    paths.push(...collectImagePaths(project.images));
    paths.push(...collectImagePathsFromExpenses(project.expenses));
  }

  for (const warranty of home.warranties || []) {
    paths.push(...collectImagePaths(warranty.images));
  }

  return paths;
}
