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
  const formatNom = nom?.trim();
  if (/^\d+$/.test(formatNom)) {
    return { 'conseillerObj.idPG': { $eq: parseInt(formatNom, 10) } };
  }
  if (formatNom) {
    return {
      'conseillerObj.nom': {
        $regex: `(?'name'${formatNom}.*$)`,
        $options: 'i',
      },
    };
  }
  return {};
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

const filterStatutContrat = (statut: string, statutOld: string[]) => {
  if (statut !== 'toutes') {
    return { statut: { $eq: statut } };
  }
  return {
    statut: {
      $in: statutOld,
    },
  };
};

const totalContrat = async (
  app: Application,
  checkAccess,
  statutOld: string[],
) => {
  const contrat = await app.service(service.misesEnRelation).Model.aggregate([
    {
      $match: {
        $and: [checkAccess],
        statut: {
          $in: statutOld,
        },
      },
    },
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        statut: '$_id',
        count: 1,
      },
    },
  ]);
  const total = contrat.reduce((acc, curr) => acc + curr.count, 0);

  return {
    contrat,
    total,
  };
};

export {
  checkAccessReadRequestMisesEnRelation,
  filterNomConseiller,
  filterPix,
  filterDiplome,
  filterCv,
  filterStatut,
  filterStatutContrat,
  totalContrat,
};
