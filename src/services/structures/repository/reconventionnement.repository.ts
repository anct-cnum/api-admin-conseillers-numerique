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

const categoriesCorrespondances = require('../../../../datas/categorieFormCorrespondances.json');

const queryGetDemarcheReconventionnement = () => gql`
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

const queryGetDossierReconventionnement = gql`
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
  type: string,
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
  type: string,
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
  if (typeConvention === 'reconventionnement') {
    return {
      'conventionnement.statut':
        StatutConventionnement.RECONVENTIONNEMENT_EN_COURS,
    };
  }
  if (typeConvention === 'conventionnement') {
    return {
      'conventionnement.statut':
        StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
    };
  }
  if (typeConvention === 'avenantAjoutPoste') {
    return {
      'demandesCoselec.statut': 'en_cours',
      'demandesCoselec.type': 'ajout',
    };
  }
  if (typeConvention === 'avenantRenduPoste') {
    return {
      'demandesCoselec.statut': 'en_cours',
      'demandesCoselec.type': 'rendu',
    };
  }

  return {
    $or: [
      {
        'conventionnement.statut': {
          $in: [
            StatutConventionnement.RECONVENTIONNEMENT_EN_COURS,
            StatutConventionnement.CONVENTIONNEMENT_EN_COURS,
          ],
        },
      },
      {
        'demandesCoselec.statut': 'en_cours',
        'demandesCoselec.type': 'ajout',
      },
      {
        'demandesCoselec.statut': 'en_cours',
        'demandesCoselec.type': 'rendu',
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
      'conventionnement.dossierReconventionnement.dateDeValidation': {
        $gte: dateDebut,
        $lte: dateFin,
      },
    };
  }
  if (typeConvention === 'conventionnement') {
    return {
      'conventionnement.statut': StatutConventionnement.CONVENTIONNEMENT_VALIDÉ,
      'conventionnement.dossierConventionnement.dateDeValidation': {
        $gte: dateDebut,
        $lte: dateFin,
      },
    };
  }

  return {
    $or: [
      {
        'conventionnement.statut':
          StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
        'conventionnement.dossierReconventionnement.dateDeValidation': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      },
      {
        'conventionnement.statut':
          StatutConventionnement.CONVENTIONNEMENT_VALIDÉ,
        'conventionnement.dossierConventionnement.dateDeValidation': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      },
    ],
  };
};

const totalParConvention = async (
  app: Application,
  req: IRequest,
  statut: string,
) => {
  const reconventionnement = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'conventionnement.statut': `RECONVENTIONNEMENT_${statut}`,
    });
  const conventionnement = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'conventionnement.statut': `CONVENTIONNEMENT_${statut}`,
    });
  const avenantAjoutPoste = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'demandesCoselec.statut': 'en_cours',
      'demandesCoselec.type': 'ajout',
    });
  const avenantRenduPoste = await app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .countDocuments({
      'demandesCoselec.statut': 'en_cours',
      'demandesCoselec.type': 'rendu',
    });
  const total =
    conventionnement +
    reconventionnement +
    avenantAjoutPoste +
    avenantRenduPoste;

  return {
    conventionnement,
    reconventionnement,
    avenantAjoutPoste,
    avenantRenduPoste,
    total,
  };
};

export {
  queryGetDemarcheReconventionnement,
  queryGetDossierReconventionnement,
  getTypeDossierDemarcheSimplifiee,
  getUrlDossierReconventionnement,
  getUrlDossierConventionnement,
  filterStatut,
  filterDateDemandeAndStatutHistorique,
  totalParConvention,
};
