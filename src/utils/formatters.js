export const fmtARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtUSD = (n) =>
  `U$D ${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0)}`;

export const fmtFecha = (str) => {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
};