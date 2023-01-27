import { Application } from '@feathersjs/express';
import { action, ressource } from '../accessList';

export default function adminRules(app: Application, can: any) {
  can(action.manage, ressource.all);
}
