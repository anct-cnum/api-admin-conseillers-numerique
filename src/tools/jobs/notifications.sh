#!/bin/bash -l

cd ${APP_HOME}

echo "Envoi des notifications: START\n"
node_modules/.bin/ts-node src/tools/prefets/notificationsNouvellesDemandesCoordinateurs.ts
node_modules/.bin/ts-node src/tools/prefets/notificationsNouvellesDemandesConseillers.ts
echo "Envoi des notifications END\n"
