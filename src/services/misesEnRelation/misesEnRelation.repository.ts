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

const filterNomConseillerOrStructure = (nom: string) => {
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
        {
          idPGConseillerStr: {
            $regex: `(?'name'${inputSearchBar}.*$)`,
            $options: 'i',
          },
        },
        {
          'structureObj.nom': {
            $regex: `(?'name'${inputSearchBar}.*$)`,
            $options: 'i',
          },
        },
        {
          idPGStructureStr: {
            $regex: `(?'name'${inputSearchBar}.*$)`,
            $options: 'i',
          },
        },
      ],
    };
  }
  return {};
};

const filterDepartement = (departement: string) => {
  if (departement === '978') {
    return { 'conseillerObj.codeCom': departement };
  }
  if (departement) {
    return { 'conseillerObj.codeDepartement': departement };
  }
  return {};
};

const filterRegion = (region: string) =>
  region ? { 'conseillerObj.codeRegion': region } : {};

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

const filterCCP1 = (ccp1: string) => {
  if (ccp1 === 'true') {
    return {
      'conseillerObj.statut': { $in: ['RECRUTE', 'RUPTURE'] },
    };
  }
  if (ccp1 === 'false') {
    return {
      'conseillerObj.statut': { $nin: ['RECRUTE', 'RUPTURE'] },
    };
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
  return {
    statut: {
      $nin: [
        'finalisee_non_disponible',
        'non_disponible',
        'renouvellement_initiee',
        'terminee',
      ],
    },
  };
};

const filterStatutContrat = (statut: string) => {
  if (statut !== 'toutes') {
    return { statut: { $eq: statut } };
  }
  return {
    statut: {
      $in: ['recrutee', 'nouvelle_rupture', 'renouvellement_initiee'],
    },
  };
};

const filterStatutContratHistorique = (statut: string) => {
  if (statut !== 'toutes' && statut !== 'renouvelee') {
    return { statut: { $eq: statut } };
  }
  if (statut === 'renouvelee') {
    return {
      statut: 'finalisee',
      miseEnRelationConventionnement: { $exists: true },
    };
  }
  return {
    statut: {
      $in: ['finalisee', 'finalisee_rupture'],
    },
  };
};

const totalHistoriqueContrat = async (app: Application, checkAccess) => {
  const contrat = await app.service(service.misesEnRelation).Model.aggregate([
    {
      $match: {
        $and: [checkAccess],
        statut: {
          $in: ['finalisee_rupture', 'finalisee'],
        },
      },
    },
    {
      $group: {
        _id: {
          statut: '$statut',
          miseEnRelationConventionnement: '$miseEnRelationConventionnement',
        },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        statut: '$_id.statut',
        miseEnRelationConventionnement: '$_id.miseEnRelationConventionnement',
        count: 1,
      },
    },
  ]);
  contrat.map((contratFormat) => {
    const item = contratFormat;
    if (contratFormat.miseEnRelationConventionnement) {
      item.statut = 'renouvelee';
      delete item.miseEnRelationConventionnement;
    }
    return item;
  });
  const total = contrat.reduce((acc, curr) => acc + curr.count, 0);

  return {
    contrat,
    total,
  };
};

const totalContrat = async (app: Application, checkAccess) => {
  const contrat = await app.service(service.misesEnRelation).Model.aggregate([
    {
      $match: {
        $and: [checkAccess],
        statut: {
          $in: ['recrutee', 'nouvelle_rupture', 'renouvellement_initiee'],
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
  filterNomConseillerOrStructure,
  filterDepartement,
  filterRegion,
  filterPix,
  filterDiplome,
  filterCCP1,
  filterCv,
  filterStatut,
  filterStatutContrat,
  filterStatutContratHistorique,
  totalHistoriqueContrat,
  totalContrat,
};
