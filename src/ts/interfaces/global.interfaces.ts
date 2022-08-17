import { AnyMongoAbility } from '@casl/ability';
import { Request } from 'express';
import { IUser } from './db.interfaces';

export interface IRequest extends Request {
	ability: AnyMongoAbility;
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
