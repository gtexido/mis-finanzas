import { useState, useEffect, useCallback } from "react";

export default function CotizadorWidget({ onSelectTC }) {
  const [cot, setCot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("https://dolarapi.com/v1/dolares");
      if (!res.ok) throw new Error("No se pudo obtener cotización");

      const data = await res.json();
      const map = {};
      data.forEach((d) => {
        map[d.casa] = d;
      });

      setCot(map);
    } catch (e) {
      setErr("No se pudo obtener cotización.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  const tipos = [
    { key: "oficial", label: "🏦 Oficial", color: "#4ade80" },
    { key: "blue", label: "🔵 Blue", color: "#60a5fa" },
    { key: "tarjeta", label: "💳 Tarjeta", color: "#a78bfa" },
    { key: "mep", label: "📈 MEP", color: "#fbbf24" },
  ];

  return (
    <div
      style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e3e",
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#7c3aed",
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          💵 COTIZACIÓN HOY
        </div>

        <button
          onClick={fetchCotizaciones}
          style={{
            background: "#1e1e2e",
            border: "none",
            color: "#7c3aed",
            borderRadius: 10,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {loading ? "..." : "↻"}
        </button>
      </div>

      {err && (
        <div style={{ color: "#f87171", fontSize: 13 }}>
          {err}
        </div>
      )}

      {loading && !cot && (
        <div
          style={{
            color: "#64748b",
            fontSize: 13,
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Cargando...
        </div>
      )}

      {cot && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {tipos.map(({ key, label, color }) => {
            const d = cot[key];
            if (!d) return null;

            return (
              <button
                key={key}
                onClick={() => onSelectTC(d.venta, label)}
                style={{
                  background: "#13131a",
                  border: `1px solid ${color}22`,
                  borderRadius: 14,
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                  {label}
                </div>

                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    color,
                  }}
                >
                  ${d.venta?.toLocaleString("es-AR")}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color,
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  Tocar para usar →
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}