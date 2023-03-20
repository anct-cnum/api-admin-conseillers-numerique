// eslint-disable-next-line import/no-unresolved
import { gql } from 'graphql-request';

const queryGetDemarcheReconventionnement = (limitDossier: number) => gql`
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
    dossiers(state: $state, order: $order, first: ${limitDossier}, after: $after) {
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

export {
  queryGetDemarcheReconventionnement,
  queryGetDossierReconventionnement,
  queryGetDemarcheReconventionnementWithoutAttributDossier,
};
