#!/bin/bash -l

cd ${APP_HOME}

echo "Création des boîtes email et envoi des emails d'onbording aux conseillers: START\n"
node_modules/.bin/ts-node src/tools/emails/onbordingConseiller.ts
echo "Création des boîtes email et envoi des emails d'onbording aux conseillers: END\n"
