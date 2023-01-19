import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessReadRequestMisesEnRelation = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.misesEnRelation)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const filterNomConseiller = (nom: string) => {
  return nom
    ? { 'conseillerObj.nom': { $regex: `(?'name'${nom}.*$)`, $options: 'i' } }
    : {};
};

const filterPix = (pix: string) => {
  if (pix) {
    const pixInt = pix.split(',').map((k: string) => parseInt(k, 10));
    return { 'conseillerObj.pix.palier': { $in: pixInt } };
  }
  return {};
};

const filterDiplome = (diplome: string) => {
  if (diplome === 'true') {
    return { 'conseillerObj.estDiplomeMedNum': { $eq: true } };
  }
  if (diplome === 'false') {
    return { 'conseillerObj.estDiplomeMedNum': { $ne: true } };
  }
  return {};
};

const filterCv = (cv: string) => {
  if (cv === 'true') {
    return { 'conseillerObj.cv': { $exists: true } };
  }
  if (cv === 'false') {
    return { 'conseillerObj.cv': { $exists: false } };
  }

  return {};
};

const filterStatut = (statut: string) => {
  if (statut !== 'toutes') {
    return { statut: { $eq: statut } };
  }
  return { statut: { $ne: 'non_disponible' } };
};

export {
  checkAccessReadRequestMisesEnRelation,
  filterNomConseiller,
  filterPix,
  filterDiplome,
  filterCv,
  filterStatut,
};
