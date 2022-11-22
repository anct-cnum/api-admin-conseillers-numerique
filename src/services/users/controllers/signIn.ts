import { Application } from '@feathersjs/express';
import { Response } from 'express';
import request from 'request';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import {
  createAccessToken,
  createRefreshToken,
} from '../../../helpers/auth/createTokens';

const allowedRoles = [
  'admin',
  'structure',
  'prefet',
  'hub_coop',
  'grandReseau',
  'coordinateur_coop',
];

const signIn = (app: Application) => async (req: IRequest, res: Response) => {
  // vérification du token provenant du frontend par le serveur d'authentification
  if (req.headers.authorization) {
    const options = {
      method: 'GET',
      url: app.get('inclusion_connect').keycloak_issuer,
      headers: {
        Authorization: req.headers.authorization,
      },
    };
    // eslint-disable-next-line consistent-return
    request(options, async (err, response, body) => {
      if (err) res.status(500).json(err);
      if (response.statusCode !== 200) {
        res.status(401).json('Accès refusé');
      } else {
        // récuperation de l'utilisateur provenant du serveur d'authentification si le token est valide
        const keycloakUser = JSON.parse(body);

        let userInDB: IUser;

        // verification de la présence de l'utilisateur du serveur d'authentification en base de données
        try {
          userInDB = await app
            .service('users')
            .Model.findOne({ sub: keycloakUser.sub })
            .select({ _id: 0, password: 0, refreshToken: 0 });

          // si il s'agit de la première connexion (utilisateur sans sub) nous regardons si le token d'inscription est valide
          if (!userInDB) {
            try {
              userInDB = await app.service('users').Model.findOneAndUpdate(
                {
                  token: req.query.verificationToken,
                  roles: { $in: allowedRoles },
                },
                {
                  $set: {
                    sub: keycloakUser.sub,
                    token: null,
                    tokenCreatedAt: null,
                    passwordCreated: true,
                  },
                },
              );
              if (!userInDB) {
                return res.status(403).json('Connexion refusée');
              }
            } catch (error) {
              return res.status(500).json(error.message);
            }
          }
        } catch (error) {
          return res.status(500).json(error.message);
        }
        try {
          // création de l'access token et du refresh token
          const accessToken = await createAccessToken(app)(userInDB);
          const refreshToken = await createRefreshToken(app)(userInDB);

          // mise à jour de l'utilisateur avec son nouveau refresh token et sa dernière date de connexion
          const user = await app
            .service('users')
            .Model.findOneAndUpdate(
              { name: userInDB.name },
              { refreshToken, lastLogin: Date.now() },
              { new: true },
            )
            .select({ _id: 0, password: 0, refreshToken: 0 });

          // envoi du refresh token dans un cookie
          res.cookie(
            app.get('inclusion_connect').refresh_token_key,
            refreshToken,
            {
              httpOnly: true,
            },
          );

          // envoi de l'access token
          return res.status(200).json({ user, accessToken });
        } catch (error) {
          return res.status(500).json(error.message);
        }
      }
    });
  }
};

export default signIn;
