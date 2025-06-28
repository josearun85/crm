import React, { useEffect } from "react";

/**
 * ChooseItemModal
 * ───────────────
 * Props
 * • open              : boolean            – show / hide
 * • onClose           : () => void         – fires on “Close” or Esc
 * • templates         : Array<{id,name}>   – rows to render as buttons
 * • onSelectTemplate  : (templateId) => {} – click handler
 *
 * NOTE: It renders nothing when `open` is false.
 */
export default function ChooseItemModal({
  open,
  onClose,
  templates = [],
  onSelectTemplate,
}) {
//   if (!open) return null;
const visibility = open ? "flex" : "none";

  /* Esc closes */
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: visibility,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 24,
          minWidth: 360,
          maxWidth: "80%",
          maxHeight: "80%",
          overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Choose a template</h3>

        {/* ─── Grid of buttons ─── */}
        {templates.length === 0 ? (
          <p style={{ margin: 0 }}>No templates available</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelectTemplate(tpl.id)}
                style={{
                  padding: "12px 8px",
                  background: "#fefce8",
                  border: "1px solid #facc15",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {tpl.name}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 24,
            padding: "6px 14px",
            border: "none",
            background: "#facc15",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}