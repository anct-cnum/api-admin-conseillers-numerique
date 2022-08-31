import { AbilityBuilder, Ability } from '@casl/ability';
import { Response } from 'express';
import { IUser } from '../ts/interfaces/db.interfaces';
import { Roles } from '../ts/types';
import { IRequest } from '../ts/interfaces/global.interfaces';

import {
  adminRules,
  structureRules,
  conseillerRules,
  prefetRules,
  hubRules,
  grandReseauRules,
} from '../helpers/accessControl/rules';

function defineAbilitiesFor(user: IUser, role: Roles) {
  const { can, build } = new AbilityBuilder(Ability);

  switch (role) {
    case 'admin':
      adminRules(can);
      break;
    case 'structure':
      structureRules(user, can);
      break;
    case 'prefet':
      prefetRules(user, can);
      break;
    case 'conseiller':
      conseillerRules(user, can);
      break;
    case 'hub_coop':
      hubRules(user, can);
      break;
    case 'grandReseau':
      grandReseauRules(user, can);
      break;
    default:
      break;
  }

  return build();
}

const ANONYMOUS_ABILITY = defineAbilitiesFor(null, null);

export default function createAbilities(req: IRequest, res: Response, next) {
  req.ability = req.user?.name
    ? defineAbilitiesFor(req.user, req.query.role as Roles)
    : ANONYMOUS_ABILITY;
  next();
}
