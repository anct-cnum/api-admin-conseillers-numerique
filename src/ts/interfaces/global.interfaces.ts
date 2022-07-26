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
  conseillersSupprimes: string;
}
export interface IStructuresConseillers {
  _id: ObjectId;
  conseiller: ObjectId[];
}
