import { Application } from '@feathersjs/express';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { StatutConventionnement } from '../../../ts/enum';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { checkAccessReadRequestStructures } from './structures.repository';
import { getCoselecConventionnement, getTimestampByDate } from '../../../utils';

const filterStatut = (typeConvention: string) => {
  if (typeConvention === 'conventionnement') {
    return {
      'conventionnement.statut':
        StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
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
        'conventionnement.statut': {
          $eq: StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
        },
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
      coordinateurCandidature: false,
      $or: [
        {
          'conventionnement.statut':
            StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
          statut: 'VALIDATION_COSELEC',
        },
        {
          statut: 'REFUS_COSELEC',
        },
      ],
      createdAt: {
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
        coordinateurCandidature: false,
        $or: [
          {
            'conventionnement.statut':
              StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
            statut: 'VALIDATION_COSELEC',
          },
          {
            statut: 'REFUS_COSELEC',
          },
        ],
        createdAt: {
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
  const conventionnement = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'conventionnement.statut':
        StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
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
  const totalAvenantAjoutPoste =
    countAvenant.find((element) => element._id === 'ajout')?.count ?? 0;
  const totalAvenantRenduPoste =
    countAvenant.find((element) => element._id === 'retrait')?.count ?? 0;
  const total =
    conventionnement + totalAvenantAjoutPoste + totalAvenantRenduPoste;

  return {
    conventionnement,
    avenantAjoutPoste: totalAvenantAjoutPoste,
    avenantRenduPoste: totalAvenantRenduPoste,
    total,
  };
};

const totalParHistoriqueConvention = async (
  app: Application,
  req: IRequest,
) => {
  const reconventionnement = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'conventionnement.statut':
        StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
    });
  const conventionnement = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      coordinateurCandidature: false,
      $or: [
        {
          'conventionnement.statut':
            StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
          statut: 'VALIDATION_COSELEC',
        },
        {
          statut: 'REFUS_COSELEC',
        },
      ],
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

const formatConventionnementForDossierConventionnement = (
  structures,
  statutConventionnement,
) =>
  structures
    .filter(
      (structure) =>
        structure?.conventionnement?.statut === statutConventionnement,
    )
    .map((structure) => {
      const item = structure.conventionnement.dossierConventionnement;
      item.dateSorted = item?.dateDeCreation;
      item.idPG = structure.idPG;
      item.nom = structure.nom;
      item._id = structure._id;
      item.typeConvention = 'conventionnement';
      item.statutConventionnement = structure.conventionnement.statut;
      item.nombreConseillersCoselec =
        getCoselecConventionnement(structure)?.nombreConseillersCoselec ?? 0;
      return item;
    });

const formatConventionnementForHistoriqueDossierConventionnement = (
  structures,
) =>
  structures
    .filter(
      (structure) =>
        structure?.statut === 'VALIDATION_COSELEC' ||
        structure?.statut === 'REFUS_COSELEC',
    )
    .map((structure) => {
      return {
        ...structure,
        dateSorted: structure.createdAt,
        typeConvention: 'conventionnement',
        nombreConseillersCoselec:
          structure?.coselec[0]?.nombreConseillersCoselec ?? 0,
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
    conventionnement = formatConventionnementForDossierConventionnement(
      structures,
      StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
    );
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
      formatConventionnementForHistoriqueDossierConventionnement(structures);
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
