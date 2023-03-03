import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { IUser, IStructures } from './db.interfaces';

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

export interface IReconventionnementDS {
  idDossier?: string;
  numeroDossier?: number;
  dateDeCreation?: Date;
  dateFinProchainContrat?: Date;
  nbPostesAttribuees?: number;
  statut?: string;
  structure?: IStructures;
  url?: string;
}
