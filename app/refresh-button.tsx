"use client";

export default function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fff",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      새로고침
    </button>
  );
}
