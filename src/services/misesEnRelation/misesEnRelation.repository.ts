import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
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
      'conseillerObj.statut': { $in: ['RECRUTE', 'TERMINE', 'RUPTURE'] },
    };
  }
  if (ccp1 === 'false') {
    return {
      'conseillerObj.statut': { $nin: ['RECRUTE', 'TERMINE', 'RUPTURE'] },
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
      $nin: ['renouvellement_initiee', 'terminee'],
    },
  };
};

const filterStatutContrat = (statut: string) => {
  if (statut !== 'toutes') {
    return { statut: { $eq: statut } };
  }
  return {
    statut: {
      $in: [
        'recrutee',
        'nouvelle_rupture',
        'renouvellement_initiee',
        'terminee_naturelle',
      ],
    },
  };
};

const filtrePiecesManquantes = (piecesManquantes: string) => {
  if (piecesManquantes === 'true') {
    return { dossierIncompletRupture: true };
  }
  if (piecesManquantes === 'false') {
    return { dossierIncompletRupture: { $exists: false } };
  }
  return {};
};

const filterStatutContratHistorique = (statut: string) => {
  if (statut === 'renouvelee') {
    return {
      statut: 'finalisee',
      miseEnRelationConventionnement: { $exists: true },
    };
  }
  if (statut === 'finalisee') {
    return {
      statut: 'finalisee',
      miseEnRelationConventionnement: { $exists: false },
    };
  }
  if (statut === 'finalisee_rupture') {
    return {
      statut: 'finalisee_rupture',
    };
  }
  if (statut === 'terminee_naturelle') {
    return {
      statut: 'terminee_naturelle',
    };
  }
  return {
    statut: {
      $in: ['finalisee', 'finalisee_rupture', 'terminee_naturelle'],
    },
  };
};

const totalHistoriqueContrat = async (app: Application, checkAccess) => {
  let contrat: any = [];
  contrat = await app.service(service.misesEnRelation).Model.aggregate([
    {
      $match: {
        $and: [checkAccess],
        statut: {
          $in: ['finalisee_rupture', 'finalisee', 'terminee_naturelle'],
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
  contrat = contrat.reduce((acc, obj) => {
    const existingObj = acc.find((item) => item.statut === obj.statut);

    if (existingObj) {
      existingObj.count += obj.count;
    } else {
      acc.push({ ...obj });
    }

    return acc;
  }, []);
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

const countConseillersRecrutees = async (
  app: Application,
  req: IRequest,
  structureId: ObjectId,
): Promise<Array<object>> =>
  app
    .service(service.misesEnRelation)
    .Model.accessibleBy(req.ability, action.read)
    .find({
      'structure.$id': structureId,
      statut: { $in: ['recrutee', 'finalisee'] },
    });

const countCoordinateurRecrutees = async (
  app: Application,
  req: IRequest,
  structureId: ObjectId,
): Promise<number> =>
  app
    .service(service.misesEnRelation)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'structure.$id': structureId,
      statut: { $in: ['recrutee', 'finalisee'] },
      $or: [
        { contratCoordinateur: true },
        { 'conseillerObj.estCoordinateur': true },
      ],
    });

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
  countConseillersRecrutees,
  countCoordinateurRecrutees,
  filtrePiecesManquantes,
};
