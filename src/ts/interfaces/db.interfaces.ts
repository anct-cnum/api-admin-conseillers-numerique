import { ObjectId } from 'mongodb';

/* eslint-disable no-unused-vars */
import { Types } from 'mongoose';
import { Reseau } from '../types';

const mongoose = require('mongoose');

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

  tokenCreatedAt?: Date;

  lastLogin?: Date;

  passwordCreated?: boolean;

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

  conseillerObj: object;

  structureObj: object;

  dateRecrutement: Date;

  dateRupture: Date | undefined;

  motifRupture: string | undefined;

  emetteurRupture: string | undefined;

  resendMailCnfsRupture: boolean | undefined;

  dossierIncompletRupture: boolean | undefined;
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
    coordinates: string;
  };

  nomCommune: string;

  codeCommune: string;

  codeDepartement: string;

  codeRegion: string;

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

  statut: string;

  datePrisePoste: Date;

  dateFinFormation: Date;

  dateDeNaissance: string;

  sexe: string;

  historique: object[];

  cv: {
    file: string;
    extension: string;
    date: Date;
  };

  telephonePro: number;

  emailPro: string;

  groupeCRA: number;

  mailProAModifier: string;

  tokenChangementMailPro: string;

  tokenChangementMailProCreatedAt: Date;

  estCoordinateur: boolean;

  groupeCRAHistorique: object[];

  listeSubordonnes: {
    type: string;
    liste: ObjectId[];
  };

  unsubscribeExtras: object;

  pix: {
    partage: boolean;

    datePartage: Date;

    palier: number;

    competence1: boolean;

    competence2: boolean;

    competence3: boolean;
  };
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
    structure: string;
    coordinates: string;
  };

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
  };
  insee: {
    etablissement: IEtablissement;
    entreprise: IEntreprise;
  };
  estZRR: boolean;
  qpvStatut: string;
  qpvListe: Array<object>;
  reseau: Reseau;
}

interface IEtablissement {
  siege_social: boolean;
  siret: string;
  naf: string;
  libelle_naf: string;
  date_mise_a_jour: number;
  commune_implantation: {
    code: string;
    value: string;
  };
  adresse: {
    l1: string;
    l2: string;
    l3: string;
    l4: string;
    l5: string;
    l6: string;
    l7: string;
    numero_voie: string;
    type_voie: string;
    nom_voie: string;
    complement_adresse: string;
    code_postal: string;
    localite: string;
  };
}

interface IEntreprise {
  siren: string;
  numero_tva_intracommunautaire: string;
  forme_juridique: string;
  raison_sociale: string;
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
  createdAt: Date;
}

export interface ConseillersSupprimes {
  _id: ObjectId;
  deletedAt: Date;
  motif: string;
  conseiller: object;
  actionUser: object;
}

export interface ConseillersRuptures {
  _id: ObjectId;
  conseillerId: ObjectId;
  structureId: ObjectId;
  dateRupture: Date;
  motifRupture: string;
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

export function isArrayConseillers(item: any): item is IConseillers[] {
  return item;
}
