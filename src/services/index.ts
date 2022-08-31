import { Application } from '../declarations';
import users from './users/users.service';
import Exports from './exports/exports.service';
import miseEnRelation from './misesEnRelation/misesEnRelation.service';
import conseillers from './conseillers/conseillers.service';
import structures from './structures/structures.service';

export default function (app: Application): void {
  app.configure(users);
  app.configure(Exports);
  app.configure(miseEnRelation);
  app.configure(conseillers);
  app.configure(structures);
}
