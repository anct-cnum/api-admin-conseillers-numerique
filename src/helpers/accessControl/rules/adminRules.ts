import { action, ressource } from '../accessList';

export default function adminRules(can) {
	can(action.manage, ressource.all);
}
