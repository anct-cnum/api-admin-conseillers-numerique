#!/bin/bash -l

cd ${APP_HOME}

echo "Rappeler la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/conseillers/rappelAvantClotureConseiller.ts
echo "Rappeler la fin de contrat naturelle END\n"
