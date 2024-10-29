import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import service from '../../helpers/services';
import { action } from '../../helpers/accessControl/accessList';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import {
  IMisesEnRelation,
  IStructures,
  IUser,
} from '../../ts/interfaces/db.interfaces';
import { ALLOWED_ROLES } from './authentication.repository';

const checkAccessReadRequestGestionnaires = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.users)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const filterRole = (role: string) => {
  if (role) {
    if (role === 'tous') {
      return {
        roles: {
          $in: [
            'admin',
            'grandReseau',
            'prefet',
            'hub',
            'coordinateur',
            'structure',
          ],
        },
      };
    }
    return { roles: role };
  }
  return {};
};

const filterNomGestionnaire = (nom: string) => {
  return nom ? { name: { $regex: `(^.*${nom}.*$)`, $options: 'i' } } : {};
};

const findUserByProConnectSub = async (
  app: Application,
  sub: string,
): Promise<IUser | null> => {
  return app
    .service(service.users)
    .Model.findOne({
      sub,
      roles: { $in: ALLOWED_ROLES },
    })
    .select({ password: 0, refreshToken: 0 });
};

const findAndUpdateUserByVerificationToken = async (
  app: Application,
  token: string,
  email: string,
  sub: string,
): Promise<IUser | null> => {
  return app.service(service.users).Model.findOneAndUpdate(
    {
      token,
      name: email,
      roles: { $in: ALLOWED_ROLES },
    },
    {
      sub,
      token: null,
      tokenCreatedAt: null,
      passwordCreated: true,
    },
  );
};

const findAndUpdateUserByEmail = async (
  app: Application,
  email: string,
  sub: string,
): Promise<IUser | null> => {
  return app.service(service.users).Model.findOneAndUpdate(
    {
      name: email,
      sub: { $exists: false },
      token: { $ne: null },
      roles: { $in: ALLOWED_ROLES },
    },
    {
      sub,
      token: null,
      tokenCreatedAt: null,
      passwordCreated: true,
    },
  );
};

const createAccessLog = async (
  app: Application,
  name: string,
  proConnectSub: string,
  ip: string,
  connexionError = false,
) => {
  return app.service('accessLogs').create({
    name,
    createdAt: new Date(),
    ip,
    proConnectSub,
    connexionError,
  });
};

const updateUserWithRefreshToken = async (
  app: Application,
  name: string,
  refreshToken: string,
): Promise<any> => {
  return app
    .service(service.users)
    .Model.findOneAndUpdate(
      { name },
      { refreshToken, lastLogin: Date.now() },
      { new: true },
    )
    .select({ password: 0, refreshToken: 0 });
};

const getStructureInfo = async (
  app: Application,
  structureId: string,
): Promise<IStructures> => {
  return app
    .service(service.structures)
    .Model.findOne({ _id: structureId }, { nom: 1, demandesCoordinateur: 1 });
};

const findRefusedRecruitmentRelations = async (
  app: Application,
  structureId: ObjectId,
): Promise<IMisesEnRelation[]> => {
  return app.service(service.misesEnRelation).Model.find({
    statut: 'interessee',
    'structure.$id': structureId,
    banniereRefusRecrutement: true,
  });
};

const countCoordinators = async (
  app: Application,
  structureId: ObjectId,
): Promise<number> => {
  return app.service(service.conseillers).Model.countDocuments({
    structureId,
    statut: 'RECRUTE',
    estCoordinateur: true,
  });
};

const findCoordinator = async (app: Application, coordinateurId: string) => {
  return app.service(service.conseillers).Model.findOne({
    _id: coordinateurId,
  });
};

const updateUserSubAndToken = async (
  app: Application,
  userId: string,
  token: string,
) => {
  return app.service(service.users).Model.updateOne(
    { _id: userId },
    {
      $set: {
        token,
        tokenCreatedAt: new Date(),
      },
      $unset: {
        sub: '',
        refreshToken: '',
      },
    },
  );
};

export {
  findUserByProConnectSub,
  findAndUpdateUserByEmail,
  createAccessLog,
  findAndUpdateUserByVerificationToken,
  checkAccessReadRequestGestionnaires,
  filterRole,
  filterNomGestionnaire,
  updateUserWithRefreshToken,
  getStructureInfo,
  findRefusedRecruitmentRelations,
  countCoordinators,
  findCoordinator,
  updateUserSubAndToken,
};
