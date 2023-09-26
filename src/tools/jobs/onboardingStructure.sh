#!/bin/bash -l

cd ${APP_HOME}

echo "Envoi des mails d'invitations aux tableau de pilotage: START\n"
node_modules/.bin/ts-node src/tools/migration/send-mail-invitations.ts --role structure --limit 50
echo "Envoi des mails d'invitations aux tableau de pilotage: END\n"
