import { action, ressource } from '../accessList';

export default function anonymeRules(can) {
  can(action.read, ressource.cras);
}
