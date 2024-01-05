import { Application } from '@feathersjs/express';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
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

async function defineAbilitiesFor(app: Application, user: IUser, role: Roles) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  switch (role) {
    case 'admin':
      adminRules(app, can);
      break;
    case 'anonyme':
      anonymeRules(app, can);
      break;
    case 'structure':
      await structureRules(app, user, can);
      break;
    case 'prefet':
      await prefetRules(app, user, can);
      break;
    case 'conseiller':
      conseillerRules(app, user, can);
      break;
    case 'hub_coop':
      await hubRules(app, user, can);
      break;
    case 'grandReseau':
      await grandReseauRules(app, user, can);
      break;
    case 'coordinateur':
      await coordinateurRules(app, user, can);
      break;
    default:
      break;
  }

  return build();
}

const ANONYMOUS_ABILITY = defineAbilitiesFor(null, null, null);

const createAbilities =
  (app: Application) => async (req: IRequest, res: Response, next) => {
    req.ability = req.user?.name
      ? await defineAbilitiesFor(app, req.user, req.query.role as Roles)
      : ANONYMOUS_ABILITY;
    next();
  };

export default createAbilities;
