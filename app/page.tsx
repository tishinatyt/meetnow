import Link from "next/link";

const S = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column" as const, background: "var(--bg)", color: "var(--text)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" },
  logoSpan: { color: "var(--accent)" },
  btn: { background: "var(--accent)", color: "#fff", padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" as const },
  hero: { flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", textAlign: "center" as const, padding: "64px 24px" },
  h1: { fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20, maxWidth: 680 },
  sub: { color: "var(--muted)", fontSize: 18, marginBottom: 36, maxWidth: 480, lineHeight: 1.6 },
  btnLg: { background: "var(--accent)", color: "#fff", padding: "16px 40px", borderRadius: 12, fontWeight: 800, fontSize: 18, display: "inline-block" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, maxWidth: 900, margin: "64px auto", padding: "0 24px", width: "100%" },
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 24px" },
  cardNum: { fontSize: 40, fontWeight: 900, color: "var(--accent)", marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  cardDesc: { color: "var(--muted)", fontSize: 14, lineHeight: 1.6 },
  footer: { textAlign: "center" as const, padding: "24px", color: "var(--muted)", fontSize: 14, borderTop: "1px solid var(--border)" },
};

export default function Home() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.logo}>Meet<span style={S.logoSpan}>Now</span></div>
        <Link href="/onboarding" style={S.btn}>Почати</Link>
      </header>

      <section style={S.hero}>
        <h1 style={S.h1}>Зустрічайся з новими людьми за вечерею</h1>
        <p style={S.sub}>Формати 2, 4, 6 людей. Алгоритм підбирає ідеальну компанію.</p>
        <Link href="/onboarding" style={S.btnLg}>Розпочати</Link>
      </section>

      <div style={S.cards}>
        <div style={S.card}>
          <div style={S.cardNum}>2</div>
          <div style={S.cardTitle}>Побачення</div>
          <div style={S.cardDesc}>Один на один. Вибір оплати — спільна або кожен за себе. Ідеально для знайомства.</div>
        </div>
        <div style={S.card}>
          <div style={S.cardNum}>4</div>
          <div style={S.cardTitle}>Маленька група</div>
          <div style={S.cardDesc}>Чотири людини за столом. Жвава розмова, нові зв&apos;язки, затишна атмосфера.</div>
        </div>
        <div style={S.card}>
          <div style={S.cardNum}>6</div>
          <div style={S.cardTitle}>Вечеря з незнайомцями</div>
          <div style={S.cardDesc}>Як Timeleft. Шестеро незнайомців, один стіл, незабутній вечір.</div>
        </div>
      </div>

      <footer style={S.footer}>© 2026 MeetNow</footer>
    </div>
  );
}
