import { supabase } from "./supabase";
import { deleteStorageImages, getSignedImageUrl } from "./imageStorage";

const BUCKET = "images";

export const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf"]);
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export function newDocumentId() {
  return "doc" + Math.random().toString(36).slice(2, 9);
}

export function validateDocumentFile(file) {
  if (!file || !ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    console.error("Invalid document file type:", file?.type);
    return false;
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    console.error("Document file too large (max 15 MB):", file.name);
    return false;
  }
  return true;
}

export async function uploadDocument(file, folder) {
  if (!validateDocumentFile(file)) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error getting user for document upload:", userError);
    return null;
  }

  const path = `${user.id}/${folder}/${crypto.randomUUID()}.pdf`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("Error uploading document:", error);
    return null;
  }

  return { id: newDocumentId(), name: file.name, path, mimeType: file.type };
}

export function documentForDb(doc) {
  if (!doc?.path) return null;
  return {
    id: doc.id,
    name: doc.name,
    path: doc.path,
    mimeType: doc.mimeType || "application/pdf",
  };
}

export function documentsForDb(documents) {
  if (!Array.isArray(documents)) return [];
  return documents.map(documentForDb).filter(Boolean);
}

export function collectDocumentPaths(documents) {
  if (!Array.isArray(documents)) return [];
  return documents.map((doc) => doc?.path).filter(Boolean);
}

export async function getSignedDocumentUrl(path) {
  return getSignedImageUrl(path);
}

export { deleteStorageImages as deleteStorageDocuments };
