import { diasRestantes, semaforo } from "../utils/dates";

export default function VencBadge({ fecha, estado }) {
  if (!fecha || estado === "pagado") return null;

  const dias = diasRestantes(fecha);
  const s = semaforo(dias);
  if (!s) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}44`,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}