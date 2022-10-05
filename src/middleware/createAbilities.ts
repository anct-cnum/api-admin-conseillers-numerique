import { AbilityBuilder, Ability } from '@casl/ability';
import { Response } from 'express';
import { IUser } from '../ts/interfaces/db.interfaces';
import { Roles } from '../ts/types';
import { IRequest } from '../ts/interfaces/global.interfaces';

import {
  adminRules,
  anonymeRules,
  structureRules,
  conseillerRules,
  prefetRules,
  hubRules,
  grandReseauRules,
  coordinateurRules,
} from '../helpers/accessControl/rules';

async function defineAbilitiesFor(user: IUser, role: Roles) {
  const { can, build } = new AbilityBuilder(Ability);

  switch (role) {
    case 'admin':
      adminRules(can);
      break;
    case 'anonyme':
      anonymeRules(can);
      break;
    case 'structure':
      await structureRules(user, can);
      break;
    case 'prefet':
      await prefetRules(user, can);
      break;
    case 'conseiller':
      conseillerRules(user, can);
      break;
    case 'hub_coop':
      await hubRules(user, can);
      break;
    case 'grandReseau':
      await grandReseauRules(user, can);
      break;
    case 'coordinateur_coop':
      await coordinateurRules(user, can);
      break;
    default:
      break;
  }

  return build();
}

const ANONYMOUS_ABILITY = defineAbilitiesFor(null, null);

export default async function createAbilities(
  req: IRequest,
  res: Response,
  next,
) {
  req.ability = req.user?.name
    ? await defineAbilitiesFor(req.user, req.query.role as Roles)
    : ANONYMOUS_ABILITY;
  next();
}
