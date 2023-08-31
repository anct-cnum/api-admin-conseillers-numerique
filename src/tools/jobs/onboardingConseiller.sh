#!/bin/bash -l

cd ${APP_HOME}

echo "Création des boîtes email et envoi des emails d'onboarding aux conseillers: START\n"
node_modules/.bin/ts-node src/tools/conseillers/onboardingConseiller.ts
echo "Création des boîtes email et envoi des emails d'onboarding aux conseillers: END\n"
