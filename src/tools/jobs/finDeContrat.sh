#!/bin/bash -l

cd ${APP_HOME}

echo "Gestion des fin de contrat naturel: START\n"
node_modules/.bin/ts-node src/tools/conseillers/fin-de-contrats.ts
echo "Gestion des fin de contrat naturel: END\n"
