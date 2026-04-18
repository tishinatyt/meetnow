"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Answer = string | string[] | number;

interface Step {
  key: string;
  question: string;
  type: "single" | "multi" | "scale";
  max?: number;
  options?: string[];
}

const STEPS: Step[] = [
  { key: "age", question: "Скільки вам років?", type: "single", options: ["18-29", "30-39", "40-49", "50+"] },
  { key: "gender", question: "Ваша стать?", type: "single", options: ["Чоловік", "Жінка", "Інше"] },
  { key: "goal", question: "Що шукаєте на вечері?", type: "multi", max: 2, options: ["Нові друзі", "Розширити світогляд", "Спробувати нове", "Змістовні розмови"] },
  { key: "energy", question: "Як ви себе описуєте?", type: "single", options: ["Інтроверт", "Амбіверт", "Екстраверт"] },
  { key: "thinking", question: "Як ви приймаєте рішення?", type: "single", options: ["Логіка і факти", "Емоції і почуття", "Залежить від настрою"] },
  { key: "values_other", question: "Що цінуєте в інших?", type: "multi", max: 3, options: ["Чесність", "Гумор", "Емпатія", "Відкритість", "Інтелект", "Креативність", "Пригоди", "Доброта"] },
  { key: "values_self", question: "Як би описали себе?", type: "multi", max: 3, options: ["Добрий", "Чесний", "Спокійний", "Розумний", "Турботливий", "Смішний", "Творчий", "Авантюрист"] },
  { key: "film", question: "Улюблений жанр фільмів?", type: "single", options: ["Комедія", "Драма", "Пригоди", "Романтика"] },
  { key: "activities", question: "Що любите робити?", type: "multi", max: 3, options: ["Жива музика", "Музеї та мистецтво", "Пригоди на природі", "Нові страви"] },
  { key: "evening", question: "Ідеальний вечір — це?", type: "single", options: ["Глибокі розмови за вином", "Сміх і ігри", "Творчі простори", "Природа"] },
  { key: "group_type", question: "Яка компанія ідеальна?", type: "single", options: ["Маленька і безпечна", "Розумна і натхненна", "Ігрива і несподівана", "Люди створюють момент"] },
  { key: "after_dinner", question: "Після ідеальної вечері ви почуваєтесь?", type: "multi", max: 3, options: ["Заряджений енергією", "Помічений і пов'язаний", "Спокійний", "Здивований"] },
  { key: "humor", question: "Мені подобається некоректний гумор", type: "scale" },
  { key: "academic", question: "Академічні успіхи важливі", type: "scale" },
  { key: "industry", question: "Ваша сфера діяльності?", type: "single", options: ["Не працюю", "Охорона здоров'я", "Технології", "Фінанси", "Фізична праця", "Творча сфера", "Освіта"] },
  { key: "relationship", question: "Ваш статус?", type: "single", options: ["Самотній", "Одружений", "Все складно", "У стосунках", "Не хочу говорити"] },
  { key: "kids", question: "У вас є діти?", type: "single", options: ["Так", "Ні", "Не хочу говорити"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const step = STEPS[current];
  const total = STEPS.length;
  const progress = ((current) / total) * 100;
  const val = answers[step.key];

  function selectSingle(opt: string) {
    const next = { ...answers, [step.key]: opt };
    setAnswers(next);
    setTimeout(() => advance(next), 300);
  }

  function toggleMulti(opt: string) {
    const cur = (val as string[]) || [];
    const already = cur.includes(opt);
    const max = step.max || 99;
    if (already) {
      setAnswers({ ...answers, [step.key]: cur.filter((x) => x !== opt) });
    } else if (cur.length < max) {
      setAnswers({ ...answers, [step.key]: [...cur, opt] });
    }
  }

  function selectScale(n: number) {
    setAnswers({ ...answers, [step.key]: n });
  }

  function advance(ans: Record<string, Answer> = answers) {
    if (current < total - 1) {
      setCurrent(current + 1);
    } else {
      localStorage.setItem("meetnow_profile", JSON.stringify(ans));
      router.push("/dashboard");
    }
  }

  const canContinue =
    step.type === "multi" ? Array.isArray(val) && (val as string[]).length >= 1 :
    step.type === "scale" ? typeof val === "number" :
    false;

  const isGrid = step.key === "age";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 40px" }}>
      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 420, height: 3, background: "var(--border)", marginBottom: 40, position: "sticky", top: 0 }}>
        <div style={{ height: "100%", background: "var(--accent)", width: `${progress}%`, transition: "width 0.3s ease", borderRadius: 2 }} />
      </div>

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Back button */}
        {current > 0 && (
          <button onClick={() => setCurrent(current - 1)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 14, cursor: "pointer", marginBottom: 16, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            ← Назад
          </button>
        )}

        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>{current + 1} / {total}</p>
        <h2 style={{ fontSize: 22, fontWeight: 500, color: "var(--text)", marginBottom: 28, lineHeight: 1.3 }}>{step.question}</h2>

        {/* Single select */}
        {step.type === "single" && (
          <div style={{ display: "grid", gridTemplateColumns: isGrid ? "1fr 1fr" : "1fr", gap: 10 }}>
            {step.options!.map((opt) => (
              <button key={opt} onClick={() => selectSingle(opt)} style={{
                background: val === opt ? "rgba(255,77,77,0.12)" : "var(--card)",
                border: `2px solid ${val === opt ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 12, padding: "14px 16px", color: "var(--text)", fontSize: 15,
                fontWeight: val === opt ? 600 : 400, cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}>{opt}</button>
            ))}
          </div>
        )}

        {/* Multi select */}
        {step.type === "multi" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              {step.options!.map((opt) => {
                const selected = Array.isArray(val) && (val as string[]).includes(opt);
                return (
                  <button key={opt} onClick={() => toggleMulti(opt)} style={{
                    background: selected ? "var(--accent)" : "var(--card)",
                    border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 100, padding: "10px 18px", color: selected ? "#fff" : "var(--text)",
                    fontSize: 14, fontWeight: selected ? 600 : 400, cursor: "pointer",
                    transition: "all 0.15s",
                  }}>{opt}</button>
                );
              })}
            </div>
            <button onClick={() => advance()} disabled={!canContinue} style={{
              width: "100%", background: canContinue ? "var(--accent)" : "var(--border)",
              color: canContinue ? "#fff" : "var(--muted)", border: "none", borderRadius: 12,
              padding: "16px", fontSize: 16, fontWeight: 700, cursor: canContinue ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}>Продовжити</button>
          </>
        )}

        {/* Scale */}
        {step.type === "scale" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => selectScale(n)} style={{
                  flex: 1, aspectRatio: "1", background: val === n ? "var(--accent)" : "var(--card)",
                  border: `2px solid ${val === n ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 10, color: val === n ? "#fff" : "var(--text)",
                  fontSize: 18, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                }}>{n}</button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 12, marginBottom: 28 }}>
              <span>Не згоден</span><span>Повністю згоден</span>
            </div>
            <button onClick={() => advance()} disabled={!canContinue} style={{
              width: "100%", background: canContinue ? "var(--accent)" : "var(--border)",
              color: canContinue ? "#fff" : "var(--muted)", border: "none", borderRadius: 12,
              padding: "16px", fontSize: 16, fontWeight: 700, cursor: canContinue ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}>Продовжити</button>
          </>
        )}
      </div>
    </div>
  );
}
