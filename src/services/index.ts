import { Application } from '../declarations';
import users from './users/users.service';
// import structures from './structures/structures.service';
// import conseillers from './conseillers/conseillers.service';
// eslint-disable-next-line no-unused-vars
export default function (app: Application): void {
	app.configure(users);
	// app.configure(structures);
	// app.configure(conseillers);
}
