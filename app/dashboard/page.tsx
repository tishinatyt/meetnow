"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("meetnow_profile");
    if (raw) setProfile(JSON.parse(raw));
  }, []);

  const tags: string[] = [];
  if (profile) {
    const energy = profile.energy as string;
    const evening = profile.evening as string;
    const goal = profile.goal as string[];
    if (energy) tags.push(energy);
    if (evening) tags.push(evening);
    if (Array.isArray(goal)) tags.push(...goal.slice(0, 2));
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 24px" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Привіт! 👋</h1>
        <p style={{ color: "var(--muted)", marginBottom: 32 }}>Твій профіль готовий.</p>

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
            {tags.map((t) => (
              <span key={t} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 100, padding: "6px 14px", fontSize: 13, color: "var(--text)" }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Link href="/create" style={{ background: "var(--accent)", color: "#fff", borderRadius: 12, padding: "16px", textAlign: "center", fontWeight: 700, fontSize: 16 }}>
            Створити зустріч
          </Link>
          <Link href="/find" style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", textAlign: "center", fontWeight: 600, fontSize: 16 }}>
            Знайти зустріч
          </Link>
        </div>
      </div>
    </div>
  );
}
