#!/bin/sh
# Next 16 + Node 24 se cuelga. Usa 20–22.
# Node 22 no va dentro del repo (Next escaneaba .tools/ → ReadPackageJSON).
# Las fuentes van en public/fonts (next/font/google bloqueaba el compile).
# --webpack: Turbopack se queda en "Compiling /" en local.
set -e
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
LOCAL_NODE="${HOME}/.local/share/isapres-premium/node22/bin/node"

major_of() {
  "$1" -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0
}

usable() {
  m="$(major_of "$1")"
  [ "$m" -ge 20 ] && [ "$m" -lt 24 ]
}

NODE=""
if usable node; then
  NODE="$(command -v node)"
elif [ -x "$LOCAL_NODE" ]; then
  NODE="$LOCAL_NODE"
elif [ -x "$ROOT/.tools/node22/bin/node" ]; then
  NODE="$ROOT/.tools/node22/bin/node"
elif [ -x /usr/local/opt/node@22/bin/node ]; then
  NODE="/usr/local/opt/node@22/bin/node"
elif [ -x /opt/homebrew/opt/node@22/bin/node ]; then
  NODE="/opt/homebrew/opt/node@22/bin/node"
fi

if [ -z "$NODE" ]; then
  echo "Este proyecto necesita Node 20–22 (ahora: $(node -v 2>/dev/null || echo no encontrado))."
  echo "Ejecuta: nvm install && nvm use"
  exit 1
fi

echo "dev: $("$NODE" -v) → next dev --webpack"
exec "$NODE" "$ROOT/node_modules/next/dist/bin/next" dev --webpack "$@"
