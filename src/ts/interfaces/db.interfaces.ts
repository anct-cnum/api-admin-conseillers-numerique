import { ObjectId } from 'mongodb';

/* eslint-disable no-unused-vars */
import { Types } from 'mongoose';
import { Reseau } from '../types';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);
const { DBRef } = mongoose.SchemaTypes;

export interface IUser {
  _id: ObjectId;

  name: string;

  password: string;

  refreshToken: string;

  sub: string;

  roles: string[];

  roleActivated: string;

  entity: typeof DBRef;

  token: string;

  resend: boolean;

  mailAModifier: string;

  mailConfirmError: string;

  mailConfirmErrorDetail: string;

  departement: string;

  region: string;

  reseau: Reseau;

  mailCoopSent: boolean;

  mailSentDate?: Date;

  mailSentCoselecDate?: Date;

  mailErrorSentCoselec?: string;

  mailErrorDetailSentCoselec?: string;

  mailSentCoselecCoordinateurDate?: Date;

  mailErrorSentCoselecCoordinateur?: string;

  mailErrorDetailSentCoselecCoordinateur?: string;

  tokenCreatedAt?: Date;

  lastLogin?: Date;

  passwordCreated?: boolean;

  resetPasswordCnil?: boolean;

  timestamps?: boolean;

  hub?: string;

  toJSON(): string | object | Buffer;
}
export interface IMisesEnRelation {
  _id: ObjectId;

  conseiller: typeof DBRef;

  structure: typeof DBRef;

  conseillerCreatedAt: Date;

  createdAt: Date;

  distance: number;

  statut: string;

  conseillerObj: IConseillers;

  structureObj: IStructures;

  dateRecrutement: Date;

  dateRupture: Date | undefined;

  motifRupture: string | undefined;

  emetteurRupture: string | undefined;

  resendMailCnfsRupture: boolean | undefined;

  dossierIncompletRupture: boolean | undefined;

  reconventionnement: boolean | undefined;

  dateDebutDeContrat: Date | undefined;

  dateFinDeContrat: Date | undefined;

  typeDeContrat: string | undefined;

  salaire: number | undefined;

  banniereAjoutRoleCoordinateur: boolean | undefined;

  contratCoordinateur: boolean | undefined;

  banniereRefusRecrutement: boolean | undefined;

  phaseConventionnement: string | undefined;
}
export interface IConseillers {
  _id: ObjectId;

  idPG: number;

  password: string;

  prenom: string;

  nom: string;

  email: string;

  telephone: string;

  distanceMax: number;

  disponible: boolean;

  createdAt: Date;

  dateDisponibilite: Date;

  estDemandeurEmploi: boolean;

  estEnEmploi: boolean;

  estEnFormation: boolean;

  estDiplomeMedNum: boolean;

  nomDiplomeMedNum: string;

  aUneExperienceMedNum: boolean;

  codePostal: string;

  location: {
    type: string;
    coordinates: number[];
  };

  nomCommune: string;

  codeCommune: string;

  codeDepartement: string;

  codeDepartementStructure: string;

  codeRegion: string;

  codeRegionStructure: string;

  emailConfirmedAt: Date;

  emailConfirmationKey: string;

  unsubscribedAt: Date;

  userCreated: boolean;

  sondageToken: string;

  sondageSentAt: Date;

  structureId?: Types.ObjectId;

  codeCom: string;

  mattermost: {
    error: boolean;

    login: string;

    id: string;

    hubJoined: boolean;
  };

  emailCN: {
    address: string;
    deleteMailboxCNError: boolean;
  };

  emailCNError: boolean;

  resetPasswordCNError: boolean;

  supHierarchique: {
    nom: string;
    prenom: string;
    numeroTelephone: string;
    email: string;
    fonction: string;
  };

  statut: string;

  datePrisePoste: Date;

  dateFinFormation: Date;

  dateDeNaissance: Date;

  sexe: string;

  historique?: object[];

  cv: {
    file: string;
    extension: string;
    date: Date;
  };

  telephonePro: number;

  emailPro: string;

  certificationPixFormation: boolean;

  groupeCRA: number;

  mailProAModifier: string;

  tokenChangementMailPro: string;

  tokenChangementMailProCreatedAt: Date;

  hasPermanence: boolean;

  estCoordinateur: boolean;

  coordinateurs?: object[];

  groupeCRAHistorique?: object[];

  ruptures?: object[];

  listeSubordonnes: {
    type: string;
    liste: ObjectId[];
  };

  unsubscribeExtras: object;

  pix?: {
    partage: boolean;

    datePartage: Date;

    palier: number;

    competence1: boolean;

    competence2: boolean;

    competence3: boolean;
  };

  inactivite: boolean;
}

export interface IStructures {
  _id: ObjectId;

  idPG: number;

  type: string;

  statut: string;

  nom: string;

  siret: string;

  aIdentifieCandidat: boolean;

  dateDebutMission: Date;

  nombreConseillersSouhaites: number;

  estLabelliseFranceServices: string;

  codePostal: string;

  location: {
    type: string;
    coordinates: number[];
  };

  coordonneesInsee: {
    type: string;
    coordinates: number[];
  };

  adresseInsee2Ban: object;

  nomCommune: string;

  codeCommune: string;

  codeDepartement: string;

  codeRegion: string;

  emailConfirmedAt: Date;

  emailConfirmationKey: string;

  unsubscribedAt: Date;

  unsubscribeExtras: object;

  createdAt: Date;

  updatedAt: Date;

  validatedAt: Date;

  importedAt: Date;

  deleted_at: Date;

  userCreated: boolean;

  coselecAt: Date;

  contact: {
    prenom: string;

    nom: string;

    fonction: string;

    email: string;

    telephone: string;

    inactivite: boolean;
  };
  insee: Iinsee;
  estZRR: boolean;
  prefet: IPrefet[];
  qpvStatut: string;
  qpvListe: Array<object>;
  reseau: Reseau;
  codeCom: string | null;
  coselec: ICoselec[];
  conventionnement: {
    statut: string;
    motif: string;
    dossierReconventionnement: {
      numero: number;
      dateDeCreation: Date;
      dateFinProchainContrat: Date;
      nbPostesAttribuees: number;
      statut: string;
      dateDernierModification: Date;
      banniereValidation?: boolean;
    };
    dossierConventionnement: {
      numero: number;
      dateDeCreation: Date;
      statut: string;
      dateDernierModification: Date;
    };
  };
  demandesCoselec: IDemandesCoselec[];
  demandesCoordinateur: IDemandesCoordinateur[];
}

interface IDemandesCoselec {
  statut: string;
  type: string;
  nombreDePostesAccordes?: number;
  nombreDePostesSouhaites: number;
  motif: string;
  emetteurAvenant: {
    date: Date;
    email: string;
  };
  banniereValidationAvenant: boolean;
  nbPostesAvantDemande: number;
  validateurAvenant?: {
    date: Date;
    email: string;
  };
}

interface ICoselec {
  nombreConseillersCoselec: number;
  avisCoselec: string;
  numero?: string;
  phaseConventionnement?: string;
  type?: string;
  observationsReferent?: string;
  prioritaireCoselec?: string;
  validateur?: string;
  insertedAt: Date;
}

interface IPrefet {
  avisPrefet: string;
  commentairePrefet: string;
  insertedAt: Date;
  idStructureTransfert?: ObjectId;
  banniereValidationAvisPrefet?: boolean;
}

export interface IDemandesCoordinateur {
  id: ObjectId;
  statut: string;
  avisPrefet?: string;
  banniereInformationAvisStructure?: boolean;
  banniereValidationAvisPrefet?: boolean;
  banniereValidationAvisAdmin?: boolean;
  miseEnRelationId?: ObjectId;
  mailSendDatePrefet?: Date;
  mailErrorSentPrefet?: string;
  mailErrorDetailSentPrefet?: string;
  emetteurValidation?: {
    date: Date;
    email: string;
  };
  dossier: {
    numero: number;
    dateDeCreation: Date;
    dateDerniereModification: Date;
  };
}

interface Iinsee {
  siret: string;
  siege_social: boolean;
  etat_administratif: string;
  date_fermeture: string;
  enseigne: string;
  activite_principale: {
    code: string;
    nomenclature: string;
    libelle: string;
  };
  tranche_effectif_salarie: {
    de: number;
    a: number;
    code: string;
    date_reference: string;
    intitule: string;
  };
  diffusable_commercialement: boolean;
  status_diffusion: string;
  date_creation: number;
  unite_legale: {
    siren: string;
    rna: string;
    siret_siege_social: string;
    type: string;
    personne_morale_attributs: {
      raison_sociale: string;
      sigle: string;
    };
    personne_physique_attributs: {
      pseudonyme: string;
      prenom_usuel: string;
      prenom_1: string;
      prenom_2: string;
      prenom_3: string;
      prenom_4: string;
      nom_usage: string;
      nom_naissance: string;
      sexe: string;
    };
    categorie_entreprise: string;
    status_diffusion: string;
    diffusable_commercialement: boolean;
    forme_juridique: {
      code: string;
      libelle: string;
    };
    activite_principale: {
      code: string;
      nomenclature: string;
      libelle: string;
    };
    tranche_effectif_salarie: {
      de: number;
      a: number;
      code: string;
      date_reference: string;
      intitule: string;
    };
    economie_sociale_et_solidaire: boolean;
    date_creation: number;
    etat_administratif: string;
  };
  adresse: {
    status_diffusion: string;
    complement_adresse: string;
    numero_voie: string;
    indice_repetition_voie: string;
    type_voie: string;
    libelle_voie: string;
    code_postal: string;
    libelle_commune: string;
    libelle_commune_etranger: string;
    distribution_speciale: string;
    code_commune: string;
    code_cedex: string;
    libelle_cedex: string;
    code_pays_etranger: string;
    libelle_pays_etranger: string;
    acheminement_postal: {
      l1: string;
      l2: string;
      l3: string;
      l4: string;
      l5: string;
      l6: string;
      l7: string;
    };
  };
}

export interface IPermanences {
  _id: ObjectId;
  estStructure: boolean;
  nomEnseigne: string;
  numeroTelephone: string;
  email: string;
  siteWeb: string;
  siret: string;
  adresse: {
    numeroRue: string;
    rue: string;
    codePostal: string;
    ville: string;
  };
  location: {
    type: string;
    coordinates: number[];
  };
  horaires: object[];
  typeAcces: string[];
  conseillers: ObjectId[];
  lieuPrincipalPour: ObjectId[];
  conseillersItinerants: ObjectId[];
  structure: typeof DBRef;
  updatedAt: Date;
  updatedBy: Date;
}

export interface ICras {
  _id: ObjectId;
  cra: {
    canal: string;
    activite: string;
    nbParticipants: number;
    age: {
      moins12ans: number;
      de12a18ans: number;
      de18a35ans: number;
      de35a60ans: number;
      plus60ans: number;
    };
    statut: {
      etudiant: number;
      sansEmploi: number;
      enEmploi: number;
      retraite: number;
      heterogene: number;
    };
    themes: string[];
    duree: string;
    accompagnement: {
      individuel: number;
      atelier: number;
      redirection: number;
    };
    codePostal: string;
    nomCommune: string;
    dateAccompagnement: Date;
    organisme: string | null;
  };
  conseiller: typeof DBRef;
  structure: typeof DBRef;
  createdAt: Date;
}

export interface IConseillersSupprimes {
  _id: ObjectId;
  deletedAt: Date;
  motif: string;
  conseiller: object;
  actionUser: object;
  historiqueContrats: IHistoriqueContrats[];
}

interface IHistoriqueContrats {
  conseillerId: Types.ObjectId;
  structureId: Types.ObjectId;
  dateRecrutement: Date;
  dateDebutDeContrat: Date;
  dateFinDeContrat: Date;
  typeDeContrat: String;
  reconventionnement: Boolean;
  phaseConventionnement: String;
  miseEnRelationReconventionnement: Types.ObjectId;
  miseEnRelationConventionnement: Types.ObjectId;
  dateRupture: Date;
  motifRupture: String;
}

export interface IConseillersRuptures {
  _id: ObjectId;
  conseillerId: Types.ObjectId;
  structureId: Types.ObjectId;
  dateRupture: Date;
  motifRupture: string;
}
export interface AccessLogs {
  createdAt: Date;
  name: string;
  ip: string;
  connexionError: boolean;
}

export interface IStatsTerritoires {
  date: string;
  nombreConseillersCoselec: number;
  cnfsActives: number;
  cnfsInactives: number;
  conseillerIds: [ObjectId];
  codeDepartement: string;
  codeRegion: string;
  nomDepartement: string;
  nomRegion: string;
  tauxActivation: number;
}

export interface IStatsConseillersCras {
  conseiller: [ObjectId];
  2021: [Object];
  2022: [Object];
  2023: [Object];
  2024: [Object];
}

export interface ICommunes {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    code: string;
    nom: string;
  };
}

export interface IQpv {
  type: string;
  properties: {
    CODE_QP: string;
    NOM_QP: string;
    COMMUNE_QP: string;
    correction?: string;
  };
  geometry: {
    type: string;
    coordinates: number[];
  };
}

export function isArrayConseillers(item: any): item is IConseillers[] {
  return item;
}
