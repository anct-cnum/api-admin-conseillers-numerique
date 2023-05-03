#!/bin/bash -l

cd ${APP_HOME}

echo "Récupération des dossiers démarche simplifiée pour le reconventionnement et le conventionnement: START\n"
node_modules/.bin/ts-node src/tools/demarcheSimplifiee/reconventionnement.ts
node_modules/.bin/ts-node src/tools/demarcheSimplifiee/conventionnement.ts
echo "Récupération des dossiers démarche simplifiée pour le reconventionnement et le conventionnement: END\n"
