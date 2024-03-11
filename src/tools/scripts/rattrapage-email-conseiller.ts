#!/usr/bin/env node
// Lancement de ce script : ts-node src/tools/scripts/rattrapage-email-conseiller.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IConseillers } from '../../ts/interfaces/db.interfaces';

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const conseillers: IConseillers[] = await app
      .service(service.conseillers)
      .Model.find({});
    const promises: Promise<void>[] = [];
    let countConseiller = 0;
    const regExpEmail =
      /^([a-zA-Z0-9]+(?:[\\._-][a-zA-Z0-9]+)*)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    conseillers.forEach((conseiller) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve) => {
        const checkEmail =
          conseiller?.email?.length > 2 && !regExpEmail.test(conseiller?.email);
        const checkEmailPro =
          conseiller?.emailPro?.length > 2 &&
          !regExpEmail.test(conseiller?.emailPro);
        const checkSupHierarchique =
          conseiller?.supHierarchique?.email?.length > 2 &&
          !regExpEmail.test(conseiller?.supHierarchique?.email);
        if (checkEmail || checkEmailPro || checkSupHierarchique) {
          const email = conseiller?.email
            ?.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          const emailPro = conseiller?.emailPro
            ?.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          const formatSupHierarchiqueMail = conseiller?.supHierarchique?.email
            ?.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          const updateObj = {
            ...(checkEmail ? { email: email.trim() } : {}),
            ...(checkEmailPro ? { emailPro: emailPro.trim() } : {}),
            ...(checkSupHierarchique
              ? { 'supHierarchique.email': formatSupHierarchiqueMail.trim() }
              : {}),
          };
          const conseillerUpdated = await app
            .service(service.conseillers)
            .Model.updateOne(
              {
                _id: conseiller._id,
              },
              {
                $set: updateObj,
              },
            );
          if (conseillerUpdated.modifiedCount > 0) {
            countConseiller += 1;
            logger.info(
              `conseiller ${conseiller._id} ${
                checkEmail && `(email): ${conseiller?.email} => ${email} /`
              }${
                checkEmailPro &&
                `(emailPro): ${conseiller?.emailPro} => ${emailPro} /`
              }${
                checkSupHierarchique &&
                `(supHierarchique): ${conseiller?.supHierarchique?.email} => ${formatSupHierarchiqueMail}`
              }`,
            );
          }
        }
        resolve();
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
    logger.info(
      `${countConseiller} / ${conseillers.length} conseillers corrigés`,
    );
  } catch (e) {
    logger.error(e);
  }
  exit();
});
