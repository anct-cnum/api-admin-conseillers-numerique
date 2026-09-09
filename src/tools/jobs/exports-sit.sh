#!/bin/bash -l

cd ${APP_HOME}

if [ "$ENABLE_EXPORT_TERRITORIAL" != "true" ]; then
  echo "Export (fiches territoriales) désactivé (ENABLE_EXPORT_TERRITORIAL != true)\n"
  exit 0
fi

echo "Exports fichier conseillers (fiches territoriales): START\n"
node_modules/.bin/ts-node src/tools/populate/conseillers-sit.ts
echo "Exports fichiers conseillers (fiches territoriales): END\n"

echo "Exports fichiers structures (fiches territoriales): START\n"
node_modules/.bin/ts-node src/tools/populate/structures-sit.ts
echo "Exports fichiers structures (fiches territoriales): END\n"
