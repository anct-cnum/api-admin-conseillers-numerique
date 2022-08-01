interface Functionnality {
	email: string;
}

interface Action {
	manage: string;
	create: string;
	read: string;
	update: string;
	delete: string;
	send: string;
}

interface Ressource {
	all: string;
	users: string;
	structures: string;
}
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
};

const functionnality: Functionnality = {
	email: 'email',
};

export { action, ressource, functionnality };
