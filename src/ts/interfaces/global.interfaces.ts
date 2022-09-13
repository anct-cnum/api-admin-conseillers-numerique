import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { IUser, IConseillers } from './db.interfaces';

export interface IRequest extends Request {
  ability: any;
  query: any;
  user?: IUser;
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
}
export interface IStructuresConseillers {
  _id: ObjectId;
  conseiller: ObjectId[];
}
