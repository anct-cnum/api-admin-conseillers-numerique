#!/bin/bash -l

cd ${APP_HOME}

echo "Récupération des dossiers démarche simplifiée pour le reconventionnement: START\n"
node src/tools/demarcheSimplifiee/reconventionnement.js
echo "Récupération des dossiers démarche simplifiée pour le reconventionnement: END\n"
