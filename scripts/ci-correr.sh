#!/usr/bin/env bash
# ======================================================================
# MIS FINANZAS - EJECUTOR DE PASOS DE CONTROL PARA GITHUB ACTIONS
# ======================================================================
# Descripción : Corre un comando y, si falla, publica las últimas líneas de
#               su salida como anotación del control. Así el motivo del
#               fallo se ve en la pantalla del pedido de cambio sin abrir
#               los registros completos.
# Uso         : bash scripts/ci-correr.sh "Título" comando argumentos...
# Seguridad   : No usa secretos ni red. Solo reenvía salida de los comandos.
# ======================================================================
titulo="$1"; shift
salida="$(mktemp)"
"$@" 2>&1 | tee "$salida"
codigo=${PIPESTATUS[0]}
if [ "$codigo" -ne 0 ]; then
  resumen="$(tail -n 25 "$salida" | tr '\r' ' ' | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}' | cut -c1-3500)"
  echo "::error title=${titulo} (código ${codigo})::${resumen}"
fi
exit "$codigo"
