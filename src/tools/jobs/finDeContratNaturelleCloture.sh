#!/bin/bash -l

cd ${APP_HOME}

echo "Cloturer le compte suite à la fin de contrat naturelle: START\n"
node_modules/.bin/ts-node src/tools/.ts
node_modules/.bin/ts-node src/tools/conseillers/ClotureConseiller.ts
echo "Cloturer le compte suite à la  la fin de contrat naturelle END\n"
