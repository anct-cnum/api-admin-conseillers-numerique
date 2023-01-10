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
  return nom ? { nom: { $regex: `(?'name'${nom}.*$)`, $options: 'i' } } : {};
};

const filterNomStructure = (nom: string) => {
  return nom
    ? { 'structureObj.nom': { $regex: `(?'name'${nom}.*$)`, $options: 'i' } }
    : {};
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

const filterDepartement = (departement: string) =>
  departement ? { codeDepartement: departement } : {};

const filterComs = (coms: string) => (coms ? { codeCom: coms } : {});

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
    case 'nouvelle_rupture':
      return {
        statut: { $eq: 'RECRUTE' },
        datePrisePoste: { $gt: dateDebut, $lt: dateFin },
      };
    case 'finalisee_rupture':
      return { statut: { $eq: 'RUPTURE' } };
    case 'contrat':
      return {
        statut: { $eq: 'RECRUTE' },
        datePrisePoste: { $gt: dateDebut, $lt: dateFin },
      };
    default:
      return {
        $or: [
          { statut: { $eq: 'RUPTURE' } },
          {
            $and: [
              { statut: { $eq: 'RECRUTE' } },
              { datePrisePoste: { $gt: dateDebut, $lt: dateFin } },
            ],
          },
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
  filterComs,
  filterCv,
  filterDiplome,
  filterPix,
};
