export const calcularRiesgoGTC45 = (nd: number, ne: number, nc: number) => {
  // Si falta algun dato, no calculamos
  if (!nd || !ne || !nc) return null;

  // Formulas base
  const np = nd * ne; // Nivel de Probabilidad
  const nr = np * nc; // Nivel de Riesgo

  let nivelRiesgo = "";
  let aceptabilidad = "";
  let colorBadge = "";

  // Logica de decision segun rangos GTC-45
  if (nr >= 600) {
    nivelRiesgo = "I";
    aceptabilidad = "No Aceptable";
    colorBadge = "bg-red-500 text-white"; // Situacion critica
  } else if (nr >= 150) {
    nivelRiesgo = "II";
    aceptabilidad = "No Aceptable o Aceptable con control";
    colorBadge = "bg-orange-500 text-white"; // Corregir de inmediato
  } else if (nr >= 40) {
    nivelRiesgo = "III";
    aceptabilidad = "Mejorable";
    colorBadge = "bg-yellow-400 text-[#0B1727]"; // Mejorar si es posible
  } else {
    nivelRiesgo = "IV";
    aceptabilidad = "Aceptable";
    colorBadge = "bg-[#20c997] text-white"; // Aceptable (Verde Menta)
  }

  return { np, nr, nivelRiesgo, aceptabilidad, colorBadge };
};
