import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px", color: "#f3efe4", background: "#0b0b0b", minHeight: "100vh", lineHeight: 1.6, fontFamily: "system-ui, sans-serif", overflowY: "auto" }}>
      <p><a href="/" style={{ color: "#d9b25a" }}>← 21 Venezolano</a></p>
      <h1 style={{ color: "#d9b25a" }}>{title}</h1>
      {children}
    </main>
  );
}
