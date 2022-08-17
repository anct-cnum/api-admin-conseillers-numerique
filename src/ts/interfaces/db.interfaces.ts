import { ObjectId } from 'mongodb';

/* eslint-disable no-unused-vars */
import { Types } from 'mongoose';

const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);
const { DBRef } = mongoose.SchemaTypes;

export interface IUser {
	_id: ObjectId;

	name: string;

	password: string;

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

	mailCoopSent: boolean;

	mailSentDate?: Date;

	tokenCreatedAt?: Date;

	passwordCreated?: boolean;

	timestamps?: boolean;

	hub?: string;
}
export interface IMisesEnRelation {
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
}
export interface IConseillers {
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

	userCreated: boolean;

	sondageToken: string;

	sondageSentAt: Date;

	structureId?: Types.ObjectId;

	codeCom: Date;

	mattermost: {
		error: boolean;

		login: String;

		id: string;

		hubJoined: boolean;
	};

	emailCN: {
		address: string;
	};

	deleteMailboxCNError: boolean;

	emailCNError: boolean;

	resetPasswordCNError: boolean;

	statut: string;

	datePrisePoste: Date;

	dateFinFormation: Date;

	dateDeNaissance: string;

	sexe: string;

	historique: object[];

	cv: {
		structure: {
			file: string;
			extension: string;
			date: Date;
		};
	};

	telephonePro: number;

	emailPro: string;

	groupeCRA: number;

	mailProAModifier: string;

	tokenChangementMailPro: string;

	tokenChangementMailProCreatedAt: Date;

	estCoordinateur: boolean;

	groupeCRAHistorique: object[];

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
	reseau: boolean;
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
