#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/structures/onboardingStructure.ts

import { Application } from '@feathersjs/express';
import CSVToJSON from 'csvtojson';
import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';

const path = require('path');
const axios = require('axios');
const circle = require('@turf/circle');

const getZrr = async (codeCommune: string) => {
  const csvFile = path.join(
    __dirname,
    '../../../datas/imports',
    'diffusion-zonages-zrr-cog2021.csv',
  );
  const zrrCsv = await CSVToJSON({ delimiter: 'auto' }).fromFile(csvFile);
  const zrr = zrrCsv
    .filter((v) => v.ZRR === 'C - Classée en ZRR')
    .map((v) => v.INSEE);

  return zrr.includes(codeCommune);
};

const getGeo = async (adresse) => {
  const adressePostale = encodeURI(
    `${adresse.numero_voie === null ? '' : adresse.numero_voie} ` +
      `${adresse.type_voie === null ? '' : adresse.type_voie} ${
        adresse.libelle_voie
      }`,
  );
  const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${adressePostale}&citycode=${adresse.code_commune}`;

  try {
    const result = await axios.get(urlAPI);
    return result?.data;
  } catch (e) {
    return new Error(`API Error : ${e} ${urlAPI}`);
  }
};

const getEtablissementBySiretEntrepriseApiV3 = async (
  siret: string,
  token: string,
) => {
  const urlSiret = `https://entreprise.api.gouv.fr/v3/insee/sirene/etablissements/${siret}?context=cnum&object=checkSiret&recipient=13002603200016`;
  const bearer = 'Bearer ';
  try {
    const result = await axios.get(urlSiret, {
      headers: {
        Authorization: bearer + token,
      },
    });
    return result?.data?.data;
  } catch (e) {
    return new Error(`API Error : ${e} ${urlSiret}`);
  }
};

const getQpv = async (
  app: Application,
  structure: IStructures,
  coordonnees: number[],
) => {
  let qpv = 'Sans objet';
  let quartiers = [];
  if (structure.type === 'COMMUNE') {
    const commune = await app.service(service.communes).Model.findOne({
      'properties.code': structure.codeCommune,
    });
    quartiers = await app.service(service.qpv).Model.find({
      geometry: { $geoIntersects: { $geometry: commune.geometry } },
    });

    qpv = quartiers.length > 0 ? 'Oui' : 'Non';
  }
  if (['COLLECTIVITE', 'GIP', 'PRIVATE'].includes(structure.type)) {
    const radius = 0.1;
    const circlePoint = circle.default(coordonnees, radius);
    quartiers = await app.service(service.qpv).Model.find({
      geometry: { $geoIntersects: { $geometry: circlePoint.geometry } },
    });

    qpv = quartiers.length > 0 ? 'Oui' : 'Non';
  }

  return { qpv, quartiers };
};

execute(__filename, async ({ app, logger, exit }) => {
  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.find({
      siret: { $ne: null },
      insee: { $exists: false },
      statut: 'VALIDATION_COSELEC',
    });
  if (structures.length === 0) {
    exit();
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
            logger.error(insee?.message ?? "l'insee est vide");
            reject();
            return;
          }
          const adresse: any | Error = await getGeo(insee.adresse);
          if (adresse instanceof Error || Object.keys(adresse).length === 0) {
            logger.error(adresse?.message ?? "l'adresse est vide");
            reject();
            return;
          }
          const { qpv, quartiers } = await getQpv(
            app,
            structure,
            adresse.features[0].geometry.coordinates,
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
                  coordonneesInsee: adresse.features[0].geometry,
                  adresseInsee2Ban: adresse.features[0].properties,
                  qpvStatut: qpv,
                  qpvListe: quartiers,
                  estZRR: isZRR,
                },
              },
            );
          if (structureUpdated.modifiedCount === 0) {
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
