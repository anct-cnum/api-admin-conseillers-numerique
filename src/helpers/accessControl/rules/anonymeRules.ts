import { Application } from '@feathersjs/express';
import { action, ressource } from '../accessList';

export default function anonymeRules(app: Application, can: any) {
  can(action.read, ressource.cras);
  can(action.read, ressource.statsConseillersCras);
  can(action.read, ressource.statsTerritoires);
}
