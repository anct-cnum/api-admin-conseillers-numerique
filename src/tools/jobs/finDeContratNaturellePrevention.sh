#!/bin/bash -l

cd ${APP_HOME}

echo "Prévenir et préparer la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/conseillers/preventionFinDeContratNaturelle.ts --fix --envoiEmail
echo "Prévenir et préparer la fin de contrat naturelle END\n"
