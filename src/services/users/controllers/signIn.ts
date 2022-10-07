import { Application } from '@feathersjs/express';
import { Response } from 'express';
import request from 'request';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import {
  createAccessToken,
  createRefreshToken,
} from '../../../helpers/auth/createTokens';

const signIn = (app: Application) => async (req: IRequest, res: Response) => {
  // vérification du token provenant du frontend par le serveur d'authentification
  if (req.headers.authorization) {
    const options = {
      method: 'GET',
      url: app.get('inclusionConnect').keycloakIssuer,
      headers: {
        Authorization: req.headers.authorization,
      },
    };
    request(options, async (err, response, body) => {
      if (err) throw new Error(err);
      if (response.statusCode !== 200) {
        res.status(401).json({
          error: 'unauthorized',
        });
      } else {
        // récuperation de l'utilisateur provenant du serveur d'authentification si le token est valide
        const keycloakUser = JSON.parse(body);
        const userEmail = keycloakUser.email;
        let userInDB: IUser;
        // verification de la présence de l'utilisateur du serveur d'authentification en base de données
        try {
          userInDB = await app
            .service('users')
            .Model.findOne({ name: userEmail })
            .select({ _id: 0, password: 0, refreshToken: 0 });
          if (!userInDB) {
            res
              .status(403)
              .json(
                'Accès refusé : utilisateur non existant dans notre base de données',
              );
          }
        } catch (error) {
          res.status(500).json(error.message);
        }
        // si il s'agit de la première connexion (utilisateur sans sub) nous mettons à jour l'utilisateur avec son identifiant unique (sub)
        if (!userInDB.sub) {
          try {
            await app
              .service('users')
              .Model.findOneAndUpdate({ sub: keycloakUser.sub });
          } catch (error) {
            res.status(500).json(error.message);
          }
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
            app.get('inclusionConnect').refreshTokenKey,
            refreshToken,
            {
              httpOnly: true,
            },
          );
          // envoi de l'access token
          res.status(200).json({ user, accessToken });
        } catch (error) {
          res.status(500).json(error.message);
        }
      }
    });
  }
};

export default signIn;
