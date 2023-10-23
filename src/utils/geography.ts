import { Application } from '@feathersjs/express';
import CSVToJSON from 'csvtojson';
import { IStructures } from '../ts/interfaces/db.interfaces';
import service from '../helpers/services';

const path = require('path');
const axios = require('axios');
const circle = require('@turf/circle');

const getZrr = async (codeCommune: string) => {
  const csvFile = path.join(__dirname, '../../datas/imports', 'zrr.csv');
  const zrrCsv = await CSVToJSON({ delimiter: 'auto' }).fromFile(csvFile);
  const zrr = zrrCsv.filter((v) => v.ZRR === '1').map((v) => v.INSEE);

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

export { getZrr, getGeo, getEtablissementBySiretEntrepriseApiV3, getQpv };
