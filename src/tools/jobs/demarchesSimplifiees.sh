#!/bin/bash -l

cd ${APP_HOME}

echo "Récupération des dossiers démarche simplifiée: START\n"
node_modules/.bin/ts-node src/tools/demarchesSimplifiees/reconventionnement.ts
node_modules/.bin/ts-node src/tools/demarchesSimplifiees/conventionnement.ts
node_modules/.bin/ts-node src/tools/demarchesSimplifiees/demandesCoordinateur.ts
echo "Récupération des dossiers démarche simplifiée: END\n"
