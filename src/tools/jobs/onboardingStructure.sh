#!/bin/bash -l

cd ${APP_HOME}

echo "Onboarding des nouvelles structures sur le TDP: START\n"
node_modules/.bin/ts-node src/tools/migration/send-mails-invitations.ts --role structure --limit 50
node_modules/.bin/ts-node src/tools/structures/onboardingStructure.ts
echo "Onboarding des nouvelles structures sur le TDP: END\n"
