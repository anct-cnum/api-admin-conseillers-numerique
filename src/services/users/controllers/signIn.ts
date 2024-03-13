import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  createAccessToken,
  createRefreshToken,
} from '../../../helpers/auth/createTokens';
import {
  IMisesEnRelation,
  IStructures,
  IUser,
} from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';

const allowedRoles = [
  'admin',
  'structure',
  'prefet',
  'hub_coop',
  'grandReseau',
  'coordinateur',
];

const axios = require('axios');

const signIn = (app: Application) => async (req: IRequest, res: Response) => {
  // vérification du token provenant du frontend par le serveur d'authentification
  if (req.headers.authorization) {
    try {
      const response = await axios(
        app.get('inclusion_connect').keycloak_issuer,
        {
          method: 'GET',
          headers: {
            Authorization: req.headers.authorization,
            'Content-Type': 'application/json',
          },
        },
      );
      if (response.status !== 200) {
        res.status(401).json('Accès refusé');
      } else {
        // récupération de l'utilisateur du serveur d'authentification si le token est valide
        const keycloakUser = response.data;
        keycloakUser.email = keycloakUser?.email?.trim()?.toLowerCase();
        let userInDB: IUser;

        // verification de la présence de l'utilisateur du serveur d'authentification en base de données
        try {
          userInDB = await app
            .service(service.users)
            .Model.findOne({
              sub: keycloakUser.sub,
              roles: { $in: allowedRoles },
            })
            .select({ password: 0, refreshToken: 0 });

          // si il s'agit de la première connexion (utilisateur sans sub) nous regardons si le token d'inscription est valide
          if (!userInDB) {
            if (req.query.verificationToken) {
              userInDB = await app
                .service(service.users)
                .Model.findOneAndUpdate(
                  {
                    token: req.query.verificationToken,
                    name: keycloakUser.email,
                    roles: { $in: allowedRoles },
                  },
                  {
                    sub: keycloakUser.sub,
                    token: null,
                    tokenCreatedAt: null,
                    passwordCreated: true,
                  },
                );
            }
            if (!userInDB) {
              userInDB = await app
                .service(service.users)
                .Model.findOneAndUpdate(
                  {
                    name: keycloakUser.email,
                    sub: { $exists: false },
                    token: { $ne: null },
                    roles: { $in: allowedRoles },
                  },
                  {
                    sub: keycloakUser.sub,
                    token: null,
                    tokenCreatedAt: null,
                    passwordCreated: true,
                  },
                );
            }
          }
        } catch (error) {
          return res.status(500).json(error);
        }
        if (!userInDB) {
          await app.service('accessLogs').create({
            name: keycloakUser.email,
            createdAt: new Date(),
            ip: req.feathers.ip,
            connexionError: true,
          });
          return res.status(401).json('Connexion refusée');
        }
        try {
          // création de l'access token et du refresh token
          const accessToken = await createAccessToken(app)(userInDB);
          const refreshToken = await createRefreshToken(app)(userInDB);

          // création d'une entrée dans la collection accessLogs
          await app.service('accessLogs').create({
            name: userInDB.name,
            createdAt: new Date(),
            ip: req.feathers.ip,
          });

          // mise à jour de l'utilisateur avec son nouveau refresh token et sa dernière date de connexion
          const user = await app
            .service(service.users)
            .Model.findOneAndUpdate(
              { name: userInDB.name },
              { refreshToken, lastLogin: Date.now() },
              { new: true },
            )
            .select({ password: 0, refreshToken: 0 });
          if (user.roles.includes('structure')) {
            const structure: IStructures = await app
              .service(service.structures)
              .Model.findOne(
                { _id: user.entity.oid },
                { nom: 1, demandesCoordinateur: 1 },
              );
            const miseEnRelationRefusRecrutement: IMisesEnRelation[] = await app
              .service(service.misesEnRelation)
              .Model.find({
                statut: 'interessee',
                'structure.$id': structure._id,
                banniereRefusRecrutement: true,
              });
            const countDemandesCoordinateurValider =
              structure?.demandesCoordinateur?.filter(
                (demandeCoordinateur) =>
                  demandeCoordinateur.statut === 'validee',
              ).length;
            const demandesCoordinateurBannerInformation =
              structure?.demandesCoordinateur?.filter(
                (demandeCoordinateur) =>
                  demandeCoordinateur?.banniereInformationAvisStructure ===
                  true,
              );
            if (countDemandesCoordinateurValider > 0) {
              const countCoordinateurs: number = await app
                .service(service.conseillers)
                .Model.countDocuments({
                  structureId: structure._id,
                  statut: 'RECRUTE',
                  estCoordinateur: true,
                });
              user._doc.displayBannerPosteCoordinateurStructure =
                countCoordinateurs < countDemandesCoordinateurValider;
            }
            if (demandesCoordinateurBannerInformation?.length > 0) {
              user._doc.demandesCoordinateurBannerInformation =
                demandesCoordinateurBannerInformation;
            }
            if (miseEnRelationRefusRecrutement?.length > 0) {
              user._doc.miseEnRelationRefusRecrutement =
                miseEnRelationRefusRecrutement;
            }
            user._doc.nomStructure = structure.nom;
          } else if (user.roles.includes('coordinateur')) {
            const countCoordinateur = await app
              .service(service.conseillers)
              .Model.countDocuments({
                _id: user.entity.oid,
                estCoordinateur: true,
              });
            user._doc.roles = ['coordinateur'];
            if (countCoordinateur === 0) {
              return res.status(401).json('Connexion refusée');
            }
          }
          // envoi du refresh token dans un cookie
          res.cookie(
            app.get('inclusion_connect').refresh_token_key,
            refreshToken,
            {
              httpOnly: true,
            },
          );
          // envoi de l'access token
          return res.status(200).json({ user: user._doc, accessToken });
        } catch (error) {
          return res.status(500).json(error.message);
        }
      }
    } catch (error) {
      return res.status(500).json(error.message);
    }
  }
  return res.status(401).json('Accès refusé');
};

export default signIn;
