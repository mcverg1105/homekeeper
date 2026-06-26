import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { getSignedDocumentUrl } from "./documentStorage";

export default function StorageDocument({ document, compact }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(!!document?.path);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrl() {
      if (!document?.path) {
        setUrl(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const signedUrl = await getSignedDocumentUrl(document.path);
      if (!cancelled) {
        setUrl(signedUrl);
        setLoading(false);
      }
    }

    resolveUrl();
    return () => {
      cancelled = true;
    };
  }, [document]);

  if (!document) return null;

  function handleOpen() {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        disabled={!url || loading}
        title={document.name}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: 0,
          border: "none",
          background: "none",
          color: "var(--text-secondary)",
          fontSize: 12,
          cursor: url && !loading ? "pointer" : "default",
          opacity: url && !loading ? 1 : 0.6,
        }}
      >
        <FileText size={12} />
        {loading ? "…" : "View"}
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {document.name}
      </span>
      <button
        type="button"
        onClick={handleOpen}
        disabled={!url || loading}
        style={{
          flexShrink: 0,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--subtle)",
          color: "var(--text-secondary)",
          fontSize: 12,
          fontWeight: 500,
          cursor: url && !loading ? "pointer" : "default",
          opacity: url && !loading ? 1 : 0.6,
        }}
      >
        {loading ? "Loading…" : "View PDF"}
      </button>
    </div>
  );
}
