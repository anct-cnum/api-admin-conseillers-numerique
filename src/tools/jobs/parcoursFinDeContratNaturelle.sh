#!/bin/bash -l

cd ${APP_HOME}

echo "Prévenir et préparer la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/conseillers/preventionFinDeContratNaturelle.ts --fix --envoiEmail
echo "Prévenir et préparer la fin de contrat naturelle END\n"
echo "Rappeler la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/conseillers/rappelAvantClotureConseiller.ts
echo "Rappeler la fin de contrat naturelle END\n"
echo "Cloturer le compte suite à la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/conseillers/ClotureConseiller.ts --fix
echo "Cloturer le compte suite à la  la fin de contrat naturelle END\n"
