/* eslint-disable prefer-template */
import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessReadRequestConseillers = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.conseillers)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const formatStatutMisesEnRelation = (
  statut: string,
  dossierIncompletRupture: boolean,
) => {
  switch (statut) {
    case 'nouvelle_rupture':
      return dossierIncompletRupture ? 'Pièces manquantes' : 'Rupture en cours';
    case 'finalisee_rupture':
      return 'Sans mission';
    case 'finalisee':
      return 'En activité';
    default:
      return '';
  }
};

const filterNomConseiller = (nom: string) => {
  const inputSearchBar = nom?.trim();
  if (inputSearchBar) {
    return {
      $or: [
        {
          nomPrenomStr: {
            $regex: `(?'name'${inputSearchBar}.*$)`,
            $options: 'i',
          },
        },
        {
          prenomNomStr: {
            $regex: `(?'name'${inputSearchBar}.*$)`,
            $options: 'i',
          },
        },
        { idPGStr: { $regex: `(?'name'${inputSearchBar}.*$)`, $options: 'i' } },
      ],
    };
  }
  return {};
};

const filterNomStructure = (nom: string) => {
  const formatNom = nom?.trim();
  if (/^\d+$/.test(formatNom)) {
    return { 'structureObj.idPG': { $eq: parseInt(formatNom, 10) } };
  }
  if (formatNom) {
    return {
      'structureObj.nom': { $regex: `(?'name'${formatNom}.*$)`, $options: 'i' },
    };
  }
  return {};
};

const filterRegion = (region: string) => (region ? { codeRegion: region } : {});

const filterIsCoordinateur = (coordinateur: string) => {
  if (coordinateur === 'true') {
    return { estCoordinateur: { $eq: true } };
  }
  if (coordinateur === 'false') {
    return { estCoordinateur: { $exists: false } };
  }

  return {};
};

const filterPix = (pix: string) => {
  if (pix) {
    const pixInt = pix.split(',').map((k: string) => parseInt(k, 10));
    return { 'pix.palier': { $in: pixInt } };
  }
  return {};
};

const filterDiplome = (diplome: string) => {
  if (diplome === 'true') {
    return { estDiplomeMedNum: { $eq: true } };
  }
  if (diplome === 'false') {
    return { estDiplomeMedNum: { $ne: true } };
  }
  return {};
};

const filterCv = (cv: string) => {
  if (cv === 'true') {
    return { cv: { $exists: true } };
  }
  if (cv === 'false') {
    return { cv: { $exists: false } };
  }

  return {};
};

const filterDepartement = (departement: string) => {
  if (departement === '978') {
    return { codeCom: departement };
  }
  if (departement) {
    return { codeDepartement: departement };
  }
  return {};
};

const filtrePiecesManquantes = (piecesManquantes: boolean) =>
  piecesManquantes
    ? { dossierIncompletRupture: true }
    : { dossierIncompletRupture: { $exists: false } };

const filterIsRuptureMisesEnRelation = (
  rupture: string,
  conseillerIdsRecruter: ObjectId[],
  structureIds: ObjectId[],
  conseillerIdsRupture: ObjectId[],
  piecesManquantes: boolean,
) => {
  switch (rupture) {
    case 'nouvelle_rupture':
      return {
        statut: { $eq: rupture },
        'conseiller.$id': { $in: conseillerIdsRecruter },
        'structure.$id': { $in: structureIds },
        ...filtrePiecesManquantes(piecesManquantes),
      };
    case 'finalisee_rupture':
      return {
        statut: { $eq: rupture },
        'conseiller.$id': { $in: conseillerIdsRupture },
      };
    case 'contrat':
      return {
        statut: { $eq: 'finalisee' },
        'conseiller.$id': { $in: conseillerIdsRecruter },
        'structure.$id': { $in: structureIds },
      };
    default:
      return {
        $or: [
          {
            $and: [
              { statut: { $eq: 'finalisee_rupture' } },
              { 'conseiller.$id': { $in: conseillerIdsRupture } },
            ],
          },
          {
            $and: [
              { statut: { $in: ['nouvelle_rupture', 'finalisee'] } },
              { 'conseiller.$id': { $in: conseillerIdsRecruter } },
              { 'structure.$id': { $in: structureIds } },
            ],
          },
        ],
      };
  }
};

const filterIsRuptureConseiller = (
  rupture: string,
  dateDebut: Date,
  dateFin: Date,
) => {
  switch (rupture) {
    case 'finalisee_rupture':
      return { statut: { $eq: 'RUPTURE' } };
    default: // contrat / nouvelle_rupture
      return {
        statut: { $eq: 'RECRUTE' },
        $or: [
          { datePrisePoste: { $gte: dateDebut, $lte: dateFin } },
          { datePrisePoste: null },
        ],
      };
  }
};

export {
  checkAccessReadRequestConseillers,
  formatStatutMisesEnRelation,
  filterIsCoordinateur,
  filterNomConseiller,
  filterNomStructure,
  filterIsRuptureMisesEnRelation,
  filterIsRuptureConseiller,
  filterRegion,
  filterDepartement,
  filterCv,
  filterDiplome,
  filterPix,
};
