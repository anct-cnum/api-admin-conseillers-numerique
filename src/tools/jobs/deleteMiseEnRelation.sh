#!/bin/bash -l

cd ${APP_HOME}

echo "Suppresion des mises en relations obsolètes: START\n"
node_modules/.bin/ts-node src/tools/conseillers/deleteMiseEnRelationConseiller.ts
node_modules/.bin/ts-node src/tools/structures/deleteMiseEnRelationStructureStatutAbandon.ts
echo "Suppresion des mises en relations obsolètes: END\n"
