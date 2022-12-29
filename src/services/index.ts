import { Application } from '../declarations';
import users from './users/users.service';
import Exports from './exports/exports.service';
import misesEnRelation from './misesEnRelation/misesEnRelation.service';
import conseillers from './conseillers/conseillers.service';
import structures from './structures/structures.service';
import stats from './stats/stats.service';
import cras from './cras/cras.service';
import statsTerritoires from './statsTerritoires/statsTerritoires.service';
import statsConseillersCras from './statsConseillersCras/statsConseillersCras.service';
import permanences from './permanences/permanences.service';
import conseillersSupprimes from './conseillersSupprimes/conseillersSupprimes.service';
import conseillersRuptures from './conseillersRuptures/conseillersRuptures.service';

export default function (app: Application): void {
  app.configure(users);
  app.configure(Exports);
  app.configure(misesEnRelation);
  app.configure(conseillers);
  app.configure(structures);
  app.configure(stats);
  app.configure(cras);
  app.configure(statsTerritoires);
  app.configure(statsConseillersCras);
  app.configure(permanences);
  app.configure(conseillersSupprimes);
  app.configure(conseillersRuptures);
}
