import { Request } from 'express';
import { IUser } from './db.interfaces';

export interface IRequest extends Request {
	ability: any;
	user?: IUser;
}

export interface Functionnality {
	email: string;
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
	conseillers: string;
}
