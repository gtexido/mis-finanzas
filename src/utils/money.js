export const montoReal = (g, tc) => {
  if (g.subconceptos && g.subconceptos.length > 0) {
    const totalUSD = g.subconceptos.reduce((a, s) => a + s.montoUSD, 0);
    return totalUSD * tc;
  }
  return g.moneda === "USD" ? g.monto * tc : g.monto;
};

export const montoUSDReal = (g) => {
  if (g.subconceptos && g.subconceptos.length > 0) {
    return g.subconceptos.reduce((a, s) => a + s.montoUSD, 0);
  }
  return g.moneda === "USD" ? g.monto : 0;
};