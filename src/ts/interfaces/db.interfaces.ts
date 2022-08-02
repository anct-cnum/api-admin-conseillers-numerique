/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');
const dbref = require('mongoose-dbref');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loaded = dbref.install(mongoose);
const { DBRef } = mongoose.SchemaTypes;

export interface IUser {
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

	mailCoopSent: boolean;

	mailSentDate?: Date;

	tokenCreatedAt?: Date;

	passwordCreated?: boolean;

	timestamps?: boolean;
}
