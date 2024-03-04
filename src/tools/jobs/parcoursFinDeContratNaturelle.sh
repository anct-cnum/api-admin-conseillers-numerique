#!/bin/bash -l

cd ${APP_HOME}

echo "Prévenir et préparer les structures à la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/structures/preventionFinDeContratNaturelle.ts
echo "Prévenir et préparer les structures à la fin de contrat naturelle END\n"
echo "Prévenir et préparer la cloture du compte conseiller: START\n"
node_modules/.bin/ts-node src/tools/conseillers/preventionFinDeContratNaturelle.ts --fix --envoiEmail
echo "Prévenir et préparer la cloture du compte conseiller END\n"
echo "Rappeler la cloture du compte suite à la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/conseillers/rappelAvantClotureConseiller.ts
echo "Rappeler la cloture du compte suite à la fin de contrat naturelle END\n"
echo "Cloturer le compte suite à la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/conseillers/clotureConseiller.ts --fix
echo "Cloturer le compte suite à la  la fin de contrat naturelle END\n"
