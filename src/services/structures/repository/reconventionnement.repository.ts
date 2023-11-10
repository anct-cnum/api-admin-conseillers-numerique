import { Application } from '@feathersjs/express';
import { gql } from 'graphql-request';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import {
  StatutConventionnement,
  TypeDossierReconventionnement,
} from '../../../ts/enum';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import {
  checkAccessReadRequestStructures,
  checkStructurePhase2,
} from './structures.repository';
import { getCoselecConventionnement, getTimestampByDate } from '../../../utils';
import {
  IDemandesCoordinateur,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import { ITypeStructure } from '../../../ts/interfaces/json.interface';

const categoriesCorrespondances = require('../../../../datas/categorieFormCorrespondances.json');

const queryGetDemarcheDemarcheSimplifiee = () => gql`
  query getDemarche($demarcheNumber: Int!, $after: String) {
    demarche(number: $demarcheNumber) {
      id
      number
      title
      dossiers(first: 100, after: $after) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          ...DossierFragment
        }
      }
    }
  }

  fragment DossierFragment on Dossier {
    id
    number
    archived
    state
    dateDerniereModification
    dateDepot
    datePassageEnConstruction
    datePassageEnInstruction
    dateTraitement
    instructeurs {
      email
    }
    usager {
      email
    }
    champs {
      ...ChampFragment
    }
  }

  fragment ChampFragment on Champ {
    id
    stringValue
    ... on DateChamp {
      date
    }
    ... on DatetimeChamp {
      datetime
    }
    ... on CheckboxChamp {
      checked: value
    }
    ... on DecimalNumberChamp {
      decimalNumber: value
    }
    ... on IntegerNumberChamp {
      integerNumber: value
    }
    ... on CiviliteChamp {
      civilite: value
    }
    ... on LinkedDropDownListChamp {
      primaryValue
      secondaryValue
    }
    ... on MultipleDropDownListChamp {
      values
    }
  }
`;

const queryGetDossierDemarcheSimplifiee = () => gql`
  query getDossier($dossierNumber: Int!) {
    dossier(number: $dossierNumber) {
      ...DossierFragment
    }
  }

  fragment DossierFragment on Dossier {
    id
    number
    archived
    state
    dateDerniereModification
    dateDepot
    datePassageEnConstruction
    datePassageEnInstruction
    dateTraitement
    champs {
      ...ChampFragment
    }
  }

  fragment ChampFragment on Champ {
    id
    label
    stringValue
    ... on DateChamp {
      date
    }
    ... on DatetimeChamp {
      datetime
    }
    ... on CheckboxChamp {
      checked: value
    }
    ... on DecimalNumberChamp {
      decimalNumber: value
    }
    ... on IntegerNumberChamp {
      integerNumber: value
    }
    ... on CiviliteChamp {
      civilite: value
    }
    ... on LinkedDropDownListChamp {
      primaryValue
      secondaryValue
    }
    ... on MultipleDropDownListChamp {
      values
    }
    ... on PieceJustificativeChamp {
      id
      label
      files {
        url
        filename
      }
    }
  }
`;

const getTypeDossierDemarcheSimplifiee = (formJuridique: string) =>
  categoriesCorrespondances.find((categorieCorrespondance) => {
    if (categorieCorrespondance.categorie.includes(formJuridique)) {
      return categorieCorrespondance;
    }
    return null;
  });

const getUrlDossierReconventionnement = (
  idPG: number,
  type: string | undefined,
  demarcheSimplifiee: IConfigurationDemarcheSimplifiee,
) => {
  switch (type) {
    case TypeDossierReconventionnement.Association:
      return `${demarcheSimplifiee.url_association_reconventionnement}${idPG}`;
    case TypeDossierReconventionnement.Entreprise:
      return `${demarcheSimplifiee.url_entreprise_reconventionnement}${idPG}`;
    case TypeDossierReconventionnement.StructurePublique:
      return `${demarcheSimplifiee.url_structure_publique_reconventionnement}${idPG}`;
    default:
      return '';
  }
};

const getUrlDossierConventionnement = (
  idPG: number,
  type: string | undefined,
  demarcheSimplifiee: IConfigurationDemarcheSimplifiee,
) => {
  switch (type) {
    case TypeDossierReconventionnement.Association:
      return `${demarcheSimplifiee.url_association_conventionnement}${idPG}`;
    case TypeDossierReconventionnement.Entreprise:
      return `${demarcheSimplifiee.url_entreprise_conventionnement}${idPG}`;
    case TypeDossierReconventionnement.StructurePublique:
      return `${demarcheSimplifiee.url_structure_publique_conventionnement}${idPG}`;
    default:
      return '';
  }
};

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
    .map((structure) => {
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
      avenants.map((avenant) => {
        const item = avenant;
        item.dateSorted = avenant.emetteurAvenant.date;
        item.typeConvention =
          item.type === 'retrait' ? 'avenantRenduPoste' : 'avenantAjoutPoste';
        item.idPG = structure.idPG;
        item.nom = structure.nom;
        item.idStructure = structure._id;

        return item;
      });
      return avenants;
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
    avenantSort = avenantSort.flat(1);
  }
  if (type === 'reconventionnement' || type === 'toutes') {
    reconventionnement = formatReconventionnementForDossierConventionnement(
      structures,
      StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
    );
  }
  if (type === 'conventionnement' || type === 'toutes') {
    conventionnement = formatConventionnementForDossierConventionnement(
      structures,
      StatutConventionnement.CONVENTIONNEMENT_VALIDÉ,
    );
  }
  const structureFormat = avenantSort.concat(
    reconventionnement,
    conventionnement,
  );

  return sortArrayConventionnement(structureFormat, ordre);
};

const getUrlDossierDepotPieceDS = (
  demandeCoordinateurValider: IDemandesCoordinateur | undefined,
  isRecrutementCoordinateur: boolean,
  structure: IStructures,
  demarcheSimplifiee: IConfigurationDemarcheSimplifiee,
) => {
  const typeStructure: ITypeStructure | undefined =
    getTypeDossierDemarcheSimplifiee(
      structure?.insee?.unite_legale?.forme_juridique?.libelle,
    );
  if (demandeCoordinateurValider && isRecrutementCoordinateur) {
    return `https://www.demarches-simplifiees.fr/dossiers/${demandeCoordinateurValider?.dossier?.numero}/messagerie`;
  }
  if (checkStructurePhase2(structure?.conventionnement?.statut)) {
    return structure?.conventionnement?.dossierReconventionnement?.numero
      ? `https://www.demarches-simplifiees.fr/dossiers/${structure?.conventionnement?.dossierReconventionnement?.numero}/messagerie`
      : getUrlDossierReconventionnement(
          structure.idPG,
          typeStructure?.type,
          demarcheSimplifiee,
        );
  }
  return structure?.conventionnement?.dossierConventionnement?.numero
    ? `https://www.demarches-simplifiees.fr/dossiers/${structure?.conventionnement?.dossierConventionnement?.numero}/messagerie`
    : getUrlDossierConventionnement(
        structure.idPG,
        typeStructure?.type,
        demarcheSimplifiee,
      );
};

const getUrlDossierDSAdmin = (
  app: Application,
  structure: IStructures,
  isRecrutementCoordinateur: boolean,
  typeStructure: ITypeStructure | undefined,
) => {
  if (isRecrutementCoordinateur) {
    const demandeCoordinateurValider = structure?.demandesCoordinateur
      ?.filter((demande) => demande.statut === 'validee')
      .pop();
    const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
      'demarche_simplifiee',
    );
    return `https://www.demarches-simplifiees.fr/procedures/${demarcheSimplifiee.numero_demarche_recrutement_coordinateur}/dossiers/${demandeCoordinateurValider?.dossier?.numero}/messagerie`;
  }
  if (checkStructurePhase2(structure?.conventionnement?.statut)) {
    return `https://www.demarches-simplifiees.fr/procedures/${typeStructure?.numero_demarche_reconventionnement}/dossiers/${structure?.conventionnement?.dossierReconventionnement?.numero}/messagerie`;
  }
  return `https://www.demarches-simplifiees.fr/procedures/${typeStructure?.numero_demarche_conventionnement}/dossiers/${structure?.conventionnement?.dossierConventionnement?.numero}/messagerie`;
};

export {
  queryGetDemarcheDemarcheSimplifiee,
  queryGetDossierDemarcheSimplifiee,
  getTypeDossierDemarcheSimplifiee,
  getUrlDossierReconventionnement,
  getUrlDossierConventionnement,
  filterStatut,
  filterDateDemandeAndStatutHistorique,
  totalParConvention,
  totalParHistoriqueConvention,
  sortDossierConventionnement,
  sortHistoriqueDossierConventionnement,
  sortArrayConventionnement,
  getUrlDossierDepotPieceDS,
  getUrlDossierDSAdmin,
};
