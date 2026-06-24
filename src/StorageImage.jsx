import { useState, useEffect } from "react";
import { getSignedImageUrl } from "./imageStorage";

export default function StorageImage({ image, alt, style, className }) {
  const [src, setSrc] = useState(image?.src || image?.preview || null);

  useEffect(() => {
    let cancelled = false;

    async function resolveSrc() {
      if (!image) {
        setSrc(null);
        return;
      }
      if (image.preview || image.src) {
        setSrc(image.preview || image.src);
        return;
      }
      if (image.path) {
        const signedUrl = await getSignedImageUrl(image.path);
        if (!cancelled) setSrc(signedUrl);
        return;
      }
      setSrc(null);
    }

    resolveSrc();
    return () => {
      cancelled = true;
    };
  }, [image]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt ?? image?.name ?? ""}
      style={style}
      className={className}
    />
  );
}
