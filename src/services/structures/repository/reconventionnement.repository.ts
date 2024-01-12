import { Application } from '@feathersjs/express';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { StatutConventionnement } from '../../../ts/enum';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  checkAccessReadRequestStructures,
  filterAvisPrefet,
} from './structures.repository';
import { getCoselec, getTimestampByDate } from '../../../utils';
import {
  findDepartementNameByNumDepartement,
  findRegionNameByNumDepartement,
} from '../../../helpers/commonQueriesFunctions';

const filterStatut = (typeConvention: string, avisPrefet: string) => {
  if (typeConvention === 'conventionnement') {
    return {
      statut: 'CREEE',
      coordinateurCandidature: false,
      createdAt: { $gte: new Date('2023-01-01') },
      'lastPrefet.avisPrefet': { $ne: 'DOUBLON' },
      ...filterAvisPrefet(avisPrefet),
    };
  }
  if (typeConvention === 'avenantAjoutPoste') {
    return {
      demandesCoselec: {
        $elemMatch: {
          statut: { $eq: 'en_cours' },
          type: { $eq: 'ajout' },
        },
      },
    };
  }
  if (typeConvention === 'avenantRenduPoste') {
    return {
      demandesCoselec: {
        $elemMatch: {
          statut: { $eq: 'en_cours' },
          type: { $eq: 'retrait' },
        },
      },
    };
  }

  return {
    $or: [
      {
        statut: 'CREEE',
        coordinateurCandidature: false,
        createdAt: { $gte: new Date('2023-01-01') },
        'lastPrefet.avisPrefet': { $ne: 'DOUBLON' },
      },
      {
        demandesCoselec: {
          $elemMatch: {
            statut: { $eq: 'en_cours' },
            type: { $eq: 'ajout' },
          },
        },
      },
      {
        demandesCoselec: {
          $elemMatch: {
            statut: { $eq: 'en_cours' },
            type: { $eq: 'retrait' },
          },
        },
      },
    ],
  };
};

const filterDateDemandeAndStatutHistorique = (
  typeConvention: string,
  dateDebut: Date,
  dateFin: Date,
) => {
  if (typeConvention === 'reconventionnement') {
    return {
      'conventionnement.statut':
        StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
      'conventionnement.dossierReconventionnement.dateDeCreation': {
        $gte: dateDebut,
        $lte: dateFin,
      },
    };
  }
  if (typeConvention === 'conventionnement') {
    return {
      'conventionnement.statut': StatutConventionnement.CONVENTIONNEMENT_VALIDÉ,
      'conventionnement.dossierConventionnement.dateDeCreation': {
        $gte: dateDebut,
        $lte: dateFin,
      },
    };
  }
  if (typeConvention === 'avenantAjoutPoste') {
    return {
      demandesCoselec: {
        $elemMatch: {
          statut: { $ne: 'en_cours' },
          type: { $eq: 'ajout' },
          'emetteurAvenant.date': {
            $gte: dateDebut,
            $lte: dateFin,
          },
        },
      },
    };
  }
  if (typeConvention === 'avenantRenduPoste') {
    return {
      demandesCoselec: {
        $elemMatch: {
          statut: { $ne: 'en_cours' },
          type: { $eq: 'retrait' },
          'emetteurAvenant.date': {
            $gte: dateDebut,
            $lte: dateFin,
          },
        },
      },
    };
  }

  return {
    $or: [
      {
        'conventionnement.statut':
          StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
        'conventionnement.dossierReconventionnement.dateDeCreation': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      },
      {
        'conventionnement.statut':
          StatutConventionnement.CONVENTIONNEMENT_VALIDÉ,
        'conventionnement.dossierConventionnement.dateDeCreation': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      },
      {
        demandesCoselec: {
          $elemMatch: {
            statut: { $ne: 'en_cours' },
            type: { $eq: 'ajout' },
            'emetteurAvenant.date': {
              $gte: dateDebut,
              $lte: dateFin,
            },
          },
        },
      },
      {
        demandesCoselec: {
          $elemMatch: {
            statut: { $ne: 'en_cours' },
            type: { $eq: 'retrait' },
            'emetteurAvenant.date': {
              $gte: dateDebut,
              $lte: dateFin,
            },
          },
        },
      },
    ],
  };
};

const totalParConvention = async (app: Application, req: IRequest) => {
  const checkAccess = await checkAccessReadRequestStructures(app, req);
  const conventionnement = await app
    .service(service.structures)
    .Model.aggregate([
      {
        $addFields: {
          lastPrefet: {
            $ifNull: [{ $arrayElemAt: ['$prefet', -1] }, null],
          },
        },
      },
      {
        $match: {
          $and: [checkAccess],
          statut: 'CREEE',
          coordinateurCandidature: false,
          'lastPrefet.avisPrefet': { $ne: 'DOUBLON' },
          createdAt: { $gte: new Date('2023-01-01') },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
  const countAvenant = await app.service(service.structures).Model.aggregate([
    {
      $match: {
        $and: [checkAccess],
      },
    },
    { $unwind: '$demandesCoselec' },
    {
      $match: {
        'demandesCoselec.statut': { $eq: 'en_cours' },
      },
    },
    {
      $group: {
        _id: '$demandesCoselec.type',
        count: { $sum: 1 },
      },
    },
  ]);
  const countConventionnement = conventionnement[0]?.count ?? 0;
  const totalAvenantAjoutPoste =
    countAvenant.find((element) => element._id === 'ajout')?.count ?? 0;
  const totalAvenantRenduPoste =
    countAvenant.find((element) => element._id === 'retrait')?.count ?? 0;
  const total =
    countConventionnement + totalAvenantAjoutPoste + totalAvenantRenduPoste;

  return {
    conventionnement: countConventionnement,
    avenantAjoutPoste: totalAvenantAjoutPoste,
    avenantRenduPoste: totalAvenantRenduPoste,
    total,
  };
};

const totalParHistoriqueConvention = async (
  app: Application,
  req: IRequest,
  dateDebut: Date,
  dateFin: Date,
) => {
  const reconventionnement = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'conventionnement.statut':
        StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
      'conventionnement.dossierReconventionnement.dateDeCreation': {
        $gte: dateDebut,
        $lte: dateFin,
      },
    });
  const conventionnement = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'conventionnement.statut': StatutConventionnement.CONVENTIONNEMENT_VALIDÉ,
      'conventionnement.dossierConventionnement.dateDeCreation': {
        $gte: dateDebut,
        $lte: dateFin,
      },
    });
  const checkAccess = await checkAccessReadRequestStructures(app, req);
  const countAvenant = await app.service(service.structures).Model.aggregate([
    {
      $match: {
        $and: [checkAccess],
      },
    },
    { $unwind: '$demandesCoselec' },
    {
      $match: {
        'demandesCoselec.statut': { $ne: 'en_cours' },
        'demandesCoselec.emetteurAvenant.date': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      },
    },
    {
      $group: {
        _id: '$demandesCoselec.type',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalAvenantAjoutPoste =
    countAvenant.find((element) => element._id === 'ajout')?.count ?? 0;
  const totalAvenantRenduPoste =
    countAvenant.find((element) => element._id === 'retrait')?.count ?? 0;
  const total =
    conventionnement +
    reconventionnement +
    totalAvenantAjoutPoste +
    totalAvenantRenduPoste;

  return {
    conventionnement,
    reconventionnement,
    avenantAjoutPoste: totalAvenantAjoutPoste,
    avenantRenduPoste: totalAvenantRenduPoste,
    total,
  };
};

const sortArrayConventionnement = (structures, ordre) =>
  structures.sort((a, b) => {
    if (getTimestampByDate(a.dateSorted) < getTimestampByDate(b.dateSorted)) {
      return ordre < 0 ? 1 : -1;
    }
    if (getTimestampByDate(a.dateSorted) > getTimestampByDate(b.dateSorted)) {
      return ordre;
    }
    return 0;
  });

const formatAvenantForDossierConventionnement = (structures) =>
  structures
    .filter((structure) => structure?.demandesCoselec?.length > 0)
    .map((structure) => {
      const avenantEnCours = structure.demandesCoselec.find(
        (demande) => demande.statut === 'en_cours',
      );
      if (!avenantEnCours) {
        return {};
      }
      avenantEnCours.dateSorted = avenantEnCours.emetteurAvenant.date;
      avenantEnCours.typeConvention =
        avenantEnCours.type === 'retrait'
          ? 'avenantRenduPoste'
          : 'avenantAjoutPoste';
      avenantEnCours.idPG = structure.idPG;
      avenantEnCours.nom = structure.nom;
      avenantEnCours.idStructure = structure._id;

      return avenantEnCours;
    });

const formatAvenantForHistoriqueDossierConventionnement = (structures, type) =>
  structures
    .filter((structure) => structure?.demandesCoselec?.length > 0)
    .flatMap((structure) => {
      let avenants = [];
      if (type === 'avenantAjoutPoste') {
        avenants = structure.demandesCoselec.filter(
          (demande) =>
            (demande.statut === 'validee' || demande.statut === 'refusee') &&
            demande.type === 'ajout',
        );
      }
      if (type === 'avenantRenduPoste') {
        avenants = structure.demandesCoselec.filter(
          (demande) =>
            demande.statut === 'validee' && demande.type === 'retrait',
        );
      }
      if (type === 'toutes') {
        avenants = structure.demandesCoselec.filter(
          (demande) =>
            demande.statut === 'validee' || demande.statut === 'refusee',
        );
      }
      if (!avenants) {
        return [];
      }
      return avenants.map((avenant) => ({
        ...avenant,
        dateSorted: avenant.emetteurAvenant.date,
        typeConvention:
          avenant.type === 'retrait'
            ? 'avenantRenduPoste'
            : 'avenantAjoutPoste',
        idPG: structure.idPG,
        nom: structure.nom,
        idStructure: structure._id,
      }));
    });

const formatReconventionnementForDossierConventionnement = (
  structures,
  statutConventionnement,
) =>
  structures
    .filter(
      (structure) =>
        structure?.conventionnement?.statut === statutConventionnement,
    )
    .map((structure) => {
      const item = structure.conventionnement.dossierReconventionnement;
      item.dateSorted = item?.dateDeCreation;
      item.idPG = structure.idPG;
      item.nom = structure.nom;
      item._id = structure._id;
      item.typeConvention = 'reconventionnement';
      item.statutConventionnement = structure.conventionnement.statut;
      return item;
    });

const formatConventionnementForDossierConventionnement = (structures) =>
  structures
    .filter(
      (structure) =>
        structure?.statut === 'CREEE' ||
        structure?.conventionnement?.statut ===
          StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
    )
    .map((structure) => {
      return {
        ...structure,
        dateSorted: structure.createdAt,
        typeConvention: 'conventionnement',
        nombreConseillersCoselec:
          getCoselec(structure)?.nombreConseillersCoselec ?? 0,
        nbPostesAvantDemande: 0,
        variation: 0,
        departement: findDepartementNameByNumDepartement(
          structure.codeDepartement,
          structure.codeCom,
        ),
        region: findRegionNameByNumDepartement(
          structure.codeDepartement,
          structure.codeCom,
        ),
      };
    });

const sortDossierConventionnement = (
  type: string,
  ordre: number,
  structures: any,
) => {
  let avenantSort: any = [];
  let conventionnement: any = [];
  if (type.includes('avenant') || type === 'toutes') {
    avenantSort = formatAvenantForDossierConventionnement(structures);
  }
  if (type === 'conventionnement' || type === 'toutes') {
    conventionnement =
      formatConventionnementForDossierConventionnement(structures);
  }
  const structureFormat = avenantSort.concat(conventionnement);

  return sortArrayConventionnement(structureFormat, ordre);
};

const sortHistoriqueDossierConventionnement = (
  type: string,
  ordre: number,
  structures: any,
) => {
  let avenantSort: any = [];
  let conventionnement: any = [];
  let reconventionnement: any = [];
  if (type.includes('avenant') || type === 'toutes') {
    avenantSort = formatAvenantForHistoriqueDossierConventionnement(
      structures,
      type,
    );
  }
  if (type === 'reconventionnement' || type === 'toutes') {
    reconventionnement = formatReconventionnementForDossierConventionnement(
      structures,
      StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
    );
  }
  if (type === 'conventionnement' || type === 'toutes') {
    conventionnement =
      formatConventionnementForDossierConventionnement(structures);
  }
  const structureFormat = avenantSort.concat(
    reconventionnement,
    conventionnement,
  );

  return sortArrayConventionnement(structureFormat, ordre);
};

export {
  filterStatut,
  filterDateDemandeAndStatutHistorique,
  totalParConvention,
  totalParHistoriqueConvention,
  sortDossierConventionnement,
  sortHistoriqueDossierConventionnement,
  sortArrayConventionnement,
};
