import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function grandReseauRules(user: IUser, can) {
  // Restreindre les permissions : les grands réseau ne peuvent voir que les informations des structures appartenant à leur organisation
  switch (user.reseau) {
    case 'Croix-Rouge':
      can([action.read], ressource.structures, {
        reseau: 'Croix-Rouge',
      });
      break;
    case 'Emmaüs Connect':
      can([action.read], ressource.structures, {
        reseau: 'Emmaüs Connect',
      });
      break;
    case 'Groupe SOS':
      can([action.read], ressource.structures, {
        reseau: 'Groupe SOS',
      });
      break;
    default:
      break;
  }
}
