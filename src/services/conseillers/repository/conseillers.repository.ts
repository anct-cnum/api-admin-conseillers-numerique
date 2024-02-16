/* eslint-disable prefer-template */
import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

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
    case 'terminee_naturelle':
      return 'Sans mission';
    case 'finalisee':
      return 'En activité';
    default:
      return '';
  }
};

const filterNomAndEmailConseiller = (search: string) => {
  const inputSearchBar = search?.trim();
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
        {
          email: {
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

const filterCCP1 = (ccp1: string) => {
  if (ccp1 === 'true') {
    return {
      statut: { $in: ['RECRUTE', 'TERMINE', 'RUPTURE'] },
    };
  }
  if (ccp1 === 'false') {
    return {
      statut: { $nin: ['RECRUTE', 'TERMINE', 'RUPTURE'] },
    };
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

const filtrePiecesManquantes = (piecesManquantes: boolean) => {
  if (piecesManquantes === true) {
    return { dossierIncompletRupture: true };
  }
  if (piecesManquantes === false) {
    return { dossierIncompletRupture: false };
  }
  if (piecesManquantes === null) {
    return { dossierIncompletRupture: { $exists: false } };
  }
  return {};
};

const filterByStatutContratMisesEnRelation = (
  statutContrat: string,
  conseillerIdsRecruter: ObjectId[],
  structureIds: ObjectId[],
  conseillerIdsRupture: ObjectId[],
  conseillerIdsTerminerNaturelle: ObjectId[],
  piecesManquantes: boolean,
) => {
  switch (statutContrat) {
    case 'nouvelle_rupture':
      return {
        statut: { $eq: statutContrat },
        'conseiller.$id': { $in: conseillerIdsRecruter },
        'structure.$id': { $in: structureIds },
        ...filtrePiecesManquantes(piecesManquantes),
      };
    case 'sans-mission':
      return {
        statut: { $in: ['finalisee_rupture', 'terminee_naturelle'] },
        'conseiller.$id': {
          $in: [conseillerIdsRupture, conseillerIdsTerminerNaturelle],
        },
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
              { statut: { $eq: 'terminee_naturelle' } },
              { 'conseiller.$id': { $in: conseillerIdsTerminerNaturelle } },
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

const filterByStatutConseiller = (
  statut: string,
  dateDebut: Date,
  dateFin: Date,
) => {
  switch (statut) {
    case 'finalisee_rupture':
    case 'terminee_naturelle':
      return { statut: { $in: ['RUPTURE', 'TERMINE'] } };
    default: // contrat / nouvelle_rupture / finalisee_rupture
      return {
        $or: [
          { statut: { $eq: 'RUPTURE' } },
          { statut: { $in: ['RUPTURE', 'TERMINE'] } },
          {
            statut: { $eq: 'RECRUTE' },
            datePrisePoste: { $gte: dateDebut, $lte: dateFin },
          },
          { statut: { $eq: 'RECRUTE' }, datePrisePoste: null },
        ],
      };
  }
};

export {
  checkAccessReadRequestConseillers,
  formatStatutMisesEnRelation,
  filterIsCoordinateur,
  filterNomAndEmailConseiller,
  filterNomStructure,
  filterByStatutContratMisesEnRelation,
  filterByStatutConseiller,
  filterRegion,
  filterDepartement,
  filterCv,
  filterDiplome,
  filterPix,
  filterCCP1,
};
