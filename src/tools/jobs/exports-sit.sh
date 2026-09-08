#!/bin/bash -l

cd ${APP_HOME}

if [ "$NODE_ENV" != "production" ]; then
  echo "Environnement non production ($NODE_ENV) : exports (fiches territoriales) désactivés\n"
  exit 0
fi

echo "Exports fichier conseillers (fiches territoriales): START\n"
node_modules/.bin/ts-node src/tools/populate/conseillers-sit.ts
echo "Exports fichiers conseillers (fiches territoriales): END\n"

echo "Exports fichiers structures (fiches territoriales): START\n"
node_modules/.bin/ts-node src/tools/populate/structures-sit.ts
echo "Exports fichiers structures (fiches territoriales): END\n"
