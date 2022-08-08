import {
	Action,
	Ressource,
	Functionnality,
} from '../../ts/interfaces/global.interfaces';

const action: Action = {
	manage: 'manage',
	create: 'create',
	read: 'read',
	update: 'update',
	delete: 'delete',
	send: 'send',
};

const ressource: Ressource = {
	all: 'all',
	users: 'users',
	structures: 'structures',
	misesEnRelation: 'misesEnRelation',
};

const functionnality: Functionnality = {
	email: 'email',
};

export { action, ressource, functionnality };
