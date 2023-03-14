import { gql } from 'graphql-request';
import TypeDossierReconventionnement from '../../../ts/enum';

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

const queryGetDemarcheReconventionnementWithoutAttributDossier = gql`
  query getDemarche($demarcheNumber: Int!, $state: DossierState) {
    demarche(number: $demarcheNumber) {
      id
      dossiers(state: $state) {
        nodes {
          ...DossierFragment
        }
      }
    }
  }

  fragment DossierFragment on Dossier {
    id
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
  demarcheSimplifiee: {
    url_association_reconventionnement: string;
    url_entreprise_reconventionnement: string;
    url_structure_publique_reconventionnement: string;
  },
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
  demarcheSimplifiee: {
    url_association_conventionnement: string;
    url_entreprise_conventionnement: string;
    url_structure_publique_conventionnement: string;
  },
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
      statutConventionnement: 'RECONVENTIONNEMENT_EN_COURS',
    };
  }
  if (typeConvention === 'conventionnement') {
    return { statutConventionnement: 'CONVENTIONNEMENT_EN_COURS' };
  }

  return {
    statutConventionnement: {
      $in: ['RECONVENTIONNEMENT_EN_COURS', 'CONVENTIONNEMENT_EN_COURS'],
    },
  };
};

const filterStatutHistorique = (typeConvention: string) => {
  if (typeConvention === 'reconventionnement') {
    return {
      statutConventionnement: 'RECONVENTIONNEMENT_VALIDÉ',
    };
  }
  if (typeConvention === 'conventionnement') {
    return {
      statutConventionnement: {
        $in: ['CONVENTIONNEMENT_VALIDÉ', 'RECONVENTIONNEMENT_EN_COURS'],
      },
    };
  }

  return {
    statutConventionnement: {
      $in: [
        'RECONVENTIONNEMENT_VALIDÉ',
        'CONVENTIONNEMENT_VALIDÉ',
        'RECONVENTIONNEMENT_EN_COURS',
      ],
    },
  };
};

const filterDateDemandeHistorique = (
  typeConvention: string,
  dateDebut: Date,
  dateFin: Date,
) => {
  if (typeConvention === 'reconventionnement') {
    return {
      statutConventionnement: 'RECONVENTIONNEMENT_VALIDÉ',
      'dossierReconventionnement.dateDeCreation': {
        $gt: dateDebut,
        $lt: dateFin,
      },
    };
  }
  if (typeConvention === 'conventionnement') {
    return {
      statutConventionnement: {
        $in: ['CONVENTIONNEMENT_VALIDÉ', 'RECONVENTIONNEMENT_EN_COURS'],
      },
      // 'dossierConventionnement.dateDeCreation': {
      //   $gt: dateDebut,
      //   $lt: dateFin,
      // },
    };
  }

  return {
    $or: [
      {
        statutConventionnement: 'RECONVENTIONNEMENT_VALIDÉ',
        'dossierReconventionnement.dateDeCreation': {
          $gt: dateDebut,
          $lt: dateFin,
        },
      },
      {
        statutConventionnement: {
          $in: ['CONVENTIONNEMENT_VALIDÉ', 'RECONVENTIONNEMENT_EN_COURS'],
        },
        // 'dossierConventionnement.dateDeCreation': {
        //   $gt: dateDebut,
        //   $lt: dateFin,
        // },
      },
    ],
  };
};

export {
  queryGetDemarcheReconventionnement,
  queryGetDossierReconventionnement,
  queryGetDemarcheReconventionnementWithoutAttributDossier,
  getTypeDossierDemarcheSimplifiee,
  getUrlDossierReconventionnement,
  getUrlDossierConventionnement,
  filterStatut,
  filterStatutHistorique,
  filterDateDemandeHistorique,
};
