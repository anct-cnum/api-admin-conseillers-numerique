import { gql } from 'graphql-request';
import { Application } from '@feathersjs/express';
import { TypeDossierReconventionnement } from '../../../ts/enum';
import { IConfigurationDemarcheSimplifiee } from '../../../ts/interfaces/global.interfaces';
import { checkStructurePhase2 } from './structures.repository';
import {
  IDemandesCoordinateur,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import { ITypeDossierDS } from '../../../ts/interfaces/json.interface';

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

const getTypeDossierDemarcheSimplifiee = (
  formJuridique: string,
  demarcheSimplifiee: IConfigurationDemarcheSimplifiee,
) => {
  const categorieCorrespondance = categoriesCorrespondances.find((categorie) =>
    categorie.categorie.includes(formJuridique),
  );
  switch (categorieCorrespondance?.type) {
    case 'association':
      return {
        ...categorieCorrespondance,
        numero_demarche_reconventionnement:
          demarcheSimplifiee.numero_demarche_association_reconventionnement,
        numero_demarche_conventionnement:
          demarcheSimplifiee.numero_demarche_association_conventionnement,
      };
    case 'entreprise':
      return {
        ...categorieCorrespondance,
        numero_demarche_reconventionnement:
          demarcheSimplifiee.numero_demarche_entreprise_reconventionnement,
        numero_demarche_conventionnement:
          demarcheSimplifiee.numero_demarche_entreprise_conventionnement,
      };
    case 'structure publique':
      return {
        ...categorieCorrespondance,
        numero_demarche_reconventionnement:
          demarcheSimplifiee.numero_demarche_structure_publique_reconventionnement,
        numero_demarche_conventionnement:
          demarcheSimplifiee.numero_demarche_structure_publique_conventionnement,
      };
    default:
      return null;
  }
};

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

const getUrlDossierDepotPieceDS = (
  demandeCoordinateurValider: IDemandesCoordinateur | undefined,
  isRecrutementCoordinateur: boolean,
  structure: IStructures,
  demarcheSimplifiee: IConfigurationDemarcheSimplifiee,
): string => {
  const typeDossierDS: ITypeDossierDS | undefined =
    getTypeDossierDemarcheSimplifiee(
      structure?.insee?.unite_legale?.forme_juridique?.libelle,
      demarcheSimplifiee,
    );
  if (demandeCoordinateurValider && isRecrutementCoordinateur) {
    return `https://www.demarches-simplifiees.fr/dossiers/${demandeCoordinateurValider?.dossier?.numero}/messagerie`;
  }
  if (checkStructurePhase2(structure?.conventionnement?.statut)) {
    return structure?.conventionnement?.dossierReconventionnement?.numero
      ? `https://www.demarches-simplifiees.fr/dossiers/${structure?.conventionnement?.dossierReconventionnement?.numero}/messagerie`
      : getUrlDossierReconventionnement(
          structure.idPG,
          typeDossierDS?.type,
          demarcheSimplifiee,
        );
  }
  return structure?.conventionnement?.dossierConventionnement?.numero
    ? `https://www.demarches-simplifiees.fr/dossiers/${structure?.conventionnement?.dossierConventionnement?.numero}/messagerie`
    : getUrlDossierConventionnement(
        structure.idPG,
        typeDossierDS?.type,
        demarcheSimplifiee,
      );
};

const getUrlDossierDSAdmin = (
  app: Application,
  structure: IStructures,
  isRecrutementCoordinateur: boolean,
  idMiseEnRelation: string | undefined,
  typeDossierDS: ITypeDossierDS | undefined,
): string => {
  if (isRecrutementCoordinateur) {
    const demandeCoordinateurValider = structure?.demandesCoordinateur?.find(
      (demande) => demande?.miseEnRelationId?.toString() === idMiseEnRelation,
    );
    const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
      'demarche_simplifiee',
    );
    return `https://www.demarches-simplifiees.fr/procedures/${demarcheSimplifiee.numero_demarche_recrutement_coordinateur}/dossiers/${demandeCoordinateurValider?.dossier?.numero}/messagerie`;
  }
  if (checkStructurePhase2(structure?.conventionnement?.statut)) {
    return `https://www.demarches-simplifiees.fr/procedures/${typeDossierDS?.numero_demarche_reconventionnement}/dossiers/${structure?.conventionnement?.dossierReconventionnement?.numero}/messagerie`;
  }
  return `https://www.demarches-simplifiees.fr/procedures/${typeDossierDS?.numero_demarche_conventionnement}/dossiers/${structure?.conventionnement?.dossierConventionnement?.numero}/messagerie`;
};

export {
  queryGetDemarcheDemarcheSimplifiee,
  queryGetDossierDemarcheSimplifiee,
  getTypeDossierDemarcheSimplifiee,
  getUrlDossierDepotPieceDS,
  getUrlDossierDSAdmin,
  getUrlDossierConventionnement,
  getUrlDossierReconventionnement,
};
