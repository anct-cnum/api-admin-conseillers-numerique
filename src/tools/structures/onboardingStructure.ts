#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/structures/onboardingStructure.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import {
  getEtablissementBySiretEntrepriseApiV3,
  getGeo,
  getQpv,
  getZrr,
} from '../../utils/geography';

execute(__filename, async ({ app, logger, Sentry, exit }) => {
  const dateMoins1Heure = new Date();
  const datePlus1Heure = new Date();
  dateMoins1Heure.setHours(dateMoins1Heure.getHours() - 1);
  datePlus1Heure.setHours(datePlus1Heure.getHours() + 1);

  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.find({
      siret: { $ne: null },
      statut: 'VALIDATION_COSELEC',
      $or: [
        {
          coselecAt: { $gte: dateMoins1Heure, $lte: datePlus1Heure },
        },
        {
          'historique.changement': 'siret',
          'historique.date': { $gte: dateMoins1Heure, $lte: datePlus1Heure },
        },
      ],
    });
  if (structures.length === 0) {
    exit();
    return;
  }
  const promises: Promise<void>[] = [];
  structures.forEach(async (structure: IStructures) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      try {
        if (/^\d{14}$/.test(structure.siret)) {
          const insee: any | Error =
            await getEtablissementBySiretEntrepriseApiV3(
              structure.siret,
              app.get('api_entreprise'),
            );
          if (insee instanceof Error || Object.keys(insee).length === 0) {
            Sentry.captureException(insee?.message ?? "l'insee est vide");
            logger.error(insee?.message ?? "l'insee est vide");
            reject();
            return;
          }
          const adresse: any | Error = await getGeo(insee.adresse);
          if (adresse instanceof Error || adresse.features.length === 0) {
            Sentry.captureException(
              adresse?.message
                ? `${adresse?.message} pour la structure ${structure.idPG}`
                : `l'adresse est vide pour la structure ${structure.idPG}`,
            );
            logger.warn(
              adresse?.message
                ? `${adresse?.message} pour la structure ${structure.idPG}`
                : `l'adresse est vide pour la structure ${structure.idPG}`,
            );
          }
          const { qpv, quartiers } = await getQpv(
            app,
            structure,
            adresse.features[0]?.geometry?.coordinates,
          );
          const isZRR = await getZrr(insee?.adresse?.code_commune);
          const structureUpdated = await app
            .service(service.structures)
            .Model.updateOne(
              {
                _id: structure._id,
              },
              {
                $set: {
                  insee,
                  coordonneesInsee: adresse.features[0]?.geometry,
                  adresseInsee2Ban: adresse.features[0]?.properties,
                  qpvStatut: qpv,
                  qpvListe: quartiers,
                  estZRR: isZRR,
                },
              },
            );
          if (structureUpdated.modifiedCount === 1) {
            await app.service(service.misesEnRelation).Model.updateMany(
              {
                'structure.$id': structure._id,
              },
              {
                $set: {
                  'structureObj.insee': insee,
                  'structureObj.coordonneesInsee':
                    adresse.features[0]?.geometry,
                  'structureObj.adresseInsee2Ban':
                    adresse.features[0]?.properties,
                  'structureObj.qpvStatut': qpv,
                  'structureObj.qpvListe': quartiers,
                  'structureObj.estZRR': isZRR,
                },
              },
            );
          } else {
            logger.warn(
              `La structure ${structure.idPG} n'a pas été mise à jour`,
            );
          }
          logger.info(`La structure ${structure.idPG} a été mise à jour`);
          resolve(p);
        } else {
          logger.error(`Le siret ${structure.siret} est incorrect`);
          reject();
        }
      } catch (e) {
        logger.error(e);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
