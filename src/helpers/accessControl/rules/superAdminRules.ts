import { action, ressource } from '../accessList';

export default function superAdminRules(can) {
	can(action.manage, ressource.all);
}
