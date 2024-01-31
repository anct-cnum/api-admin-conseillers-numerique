import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { IUser } from './db.interfaces';

export interface IRequest extends Request {
  ability: any;
  query: any;
  user?: IUser;
  decoded: IUser;
}

export interface Functionnality {
  email: string;
  exportHub: string;
}

export interface Action {
  manage: string;
  create: string;
  read: string;
  update: string;
  delete: string;
  send: string;
}

export interface Ressource {
  all: string;
  users: string;
  structures: string;
  misesEnRelation: string;
  conseillers: string;
  statsTerritoires: string;
  cras: string;
  statsConseillersCras: string;
  permanences: string;
  conseillersSupprimes: string;
  conseillersRuptures: string;
  qpv: string;
  communes: string;
  hubs: string;
}

export interface IStructuresConseillers {
  _id: ObjectId;
  conseiller: ObjectId[];
}

export interface ICodeRegion {
  nom: string;
  code: string;
}

export interface IDepartement {
  num_dep: string;
  dep_name: string;
  region_name: string;
}

export interface ICodesPostauxQuery {
  'cra.dateAccompagnement'?: {
    $gte: Date;
    $lte: Date;
  };
  'cra.codePostal'?: {
    $regex: string;
  };
}

export interface IDossierDS {
  _id?: string;
  idPG?: number;
  dateDeCreation?: Date;
  dateFinProchainContrat?: Date;
  dateDerniereModification?: Date;
  nbPostesAttribuees?: number;
  statut?: string;
}

export interface IConfigurationDemarcheSimplifiee {
  endpoint: string;
  token_api: string;
  url_association_reconventionnement: string;
  url_entreprise_reconventionnement: string;
  url_structure_publique_reconventionnement: string;
  url_association_conventionnement: string;
  url_entreprise_conventionnement: string;
  url_structure_publique_conventionnement: string;
  numero_demarche_recrutement_coordinateur: string;
}

export interface IMattermost {
  endPoint: string;
  login: string;
  password: string;
  teamId: string;
  hubTeamId: string;
}
