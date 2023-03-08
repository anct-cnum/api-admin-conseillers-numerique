import { gql } from 'graphql-request';
import TypeDossierReconventionnement from '../../../ts/enum';

const categoriesCorrespondances = require('../../../../datas/categorieFormCorrespondances.json');

const queryGetDemarcheReconventionnement = () => gql`
  query getDemarche(
    $demarcheNumber: Int!
    $state: DossierState
    $order: Order
    $after: String
  ) {
    demarche(number: $demarcheNumber) {
      id
      number
      title
      dossiers(state: $state, order: $order, after: $after) {
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
  type: string,
  demarcheSimplifiee: {
    url_association_conventionnement: string;
    url_entreprise_conventionnement: string;
    url_structure_publique_conventionnement: string;
  },
) => {
  switch (type) {
    case TypeDossierReconventionnement.Association:
      return demarcheSimplifiee.url_association_conventionnement;
    case TypeDossierReconventionnement.Entreprise:
      return demarcheSimplifiee.url_entreprise_conventionnement;
    case TypeDossierReconventionnement.StructurePublique:
      return demarcheSimplifiee.url_structure_publique_conventionnement;
    default:
      return '';
  }
};

const filterStatut = (typeConvention: string) => {
  if (typeConvention === 'reconventionnement') {
    return {
      statutConventionnement: 'Reconventionnement',
    };
  }
  if (typeConvention === 'conventionnement') {
    return { statutConventionnement: 'Conventionnement' };
  }

  return {
    statutConventionnement: { $in: ['Reconventionnement', 'Conventionnement'] },
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
};
