#!/usr/bin/env node
// Lancement de ce script : ts-node src/tools/scripts/rattrapage-email-permanence.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IPermanences } from '../../ts/interfaces/db.interfaces';

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const permanences: IPermanences[] = await app
      .service(service.permanences)
      .Model.find();
    const promises: Promise<void>[] = [];
    const regExpEmail =
      /^([a-zA-Z0-9]+(?:[\\._-][a-zA-Z0-9]+)*)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    permanences.forEach((permanence) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve) => {
        if (
          permanence?.email?.length > 2 &&
          !regExpEmail.test(permanence.email)
        ) {
          const formatMail = permanence.email
            ?.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          const permanenceUpdated = await app
            .service(service.permanences)
            .Model.updateOne(
              {
                _id: permanence._id,
              },
              {
                $set: {
                  email: formatMail.trim(),
                },
              },
            );
          if (permanenceUpdated.modifiedCount > 0) {
            logger.info(
              `Permanence ${permanence._id} : ${permanence.email} => ${formatMail}`,
            );
          }
        }
        resolve();
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
  } catch (e) {
    logger.error(e);
  }
  exit(0, 'Migration terminée');
});
