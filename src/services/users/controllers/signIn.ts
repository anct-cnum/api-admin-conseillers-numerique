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
import {
  disconnectProConnectUser,
  getProConnectAccessToken,
  getProConnectUserInfo,
} from '../authentication.repository';
import {
  countCoordinators,
  createAccessLog,
  findAndUpdateUserByEmail,
  findAndUpdateUserByVerificationToken,
  findCoordinator,
  findRefusedRecruitmentRelations,
  findUserByProConnectSub,
  getStructureInfo,
  updateUserSubAndToken,
  updateUserWithRefreshToken,
} from '../users.repository';

const { v4: uuidv4 } = require('uuid');

const signIn = (app: Application) => async (req: IRequest, res: Response) => {
  const { code, state } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Requête invalide' });
  }
  try {
    const { proConnectAccessToken, idToken } = await getProConnectAccessToken(
      app,
      code,
    );
    const proConnectUser = await getProConnectUserInfo(
      app,
      proConnectAccessToken,
    );
    if (!proConnectUser) {
      return res.status(401).json('Token invalide');
    }
    let userInDB: IUser;
    // verification de la présence de l'utilisateur du serveur d'authentification en base de données
    try {
      userInDB = await findUserByProConnectSub(app, proConnectUser.sub);
      // si il s'agit de la première connexion (utilisateur sans sub) nous regardons si le token d'inscription est valide
      if (!userInDB) {
        if (req.query.verificationToken) {
          userInDB = await findAndUpdateUserByVerificationToken(
            app,
            req.query.verificationToken,
            proConnectUser.email,
            proConnectUser.sub,
          );
        }
        if (!userInDB) {
          userInDB = await findAndUpdateUserByEmail(
            app,
            proConnectUser.email,
            proConnectUser.sub,
          );
        }
      }
    } catch (error) {
      return res.status(500).json(error);
    }
    if (!userInDB) {
      const logoutUrl = await disconnectProConnectUser(app, idToken, state);
      await createAccessLog(app, proConnectUser.email, req.feathers.ip, true);
      return res.status(401).json({
        message: 'Connexion refusée',
        logoutUrl,
      });
    }
    try {
      // création de l'access token et du refresh token
      const accessToken = await createAccessToken(app)(userInDB);
      const refreshToken = await createRefreshToken(app)(userInDB);
      // création d'une entrée dans la collection accessLogs
      await createAccessLog(app, proConnectUser.email, req.feathers.ip);
      // mise à jour de l'utilisateur avec son nouveau refresh token et sa dernière date de connexion
      const user = await updateUserWithRefreshToken(
        app,
        userInDB.name,
        refreshToken,
      );
      if (user.roles.includes('structure')) {
        const structure: IStructures = await getStructureInfo(
          app,
          user.entity.oid,
        );
        const miseEnRelationRefusRecrutement: IMisesEnRelation[] =
          await findRefusedRecruitmentRelations(app, structure._id);
        const countDemandesCoordinateurValidees =
          structure?.demandesCoordinateur?.filter(
            (demandeCoordinateur) => demandeCoordinateur.statut === 'validee',
          ).length;
        const demandesCoordinateurBannerInformation =
          structure?.demandesCoordinateur?.filter(
            (demandeCoordinateur) =>
              demandeCoordinateur?.banniereInformationAvisStructure === true,
          );
        if (countDemandesCoordinateurValidees > 0) {
          const countCoordinateurs: number = await countCoordinators(
            app,
            structure._id,
          );
          user._doc.displayBannerPosteCoordinateurStructure =
            countCoordinateurs < countDemandesCoordinateurValidees;
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
        user._doc.roles = ['coordinateur']; // FIX ordre rôle
        const coordinateur = await findCoordinator(app, user.entity.oid);
        if (
          coordinateur?.estCoordinateur !== true ||
          coordinateur?.emailCN?.address !== proConnectUser.email
        ) {
          await updateUserSubAndToken(app, user._id, uuidv4());
          return res.status(401).json('Connexion refusée');
        }
      }
      // envoi du refresh token dans un cookie
      res.cookie(app.get('pro_connect').refresh_token_key, refreshToken, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
      });
      // envoi de l'access token
      return res.status(200).json({ user: user._doc, accessToken });
    } catch (error) {
      return res.status(500).json(error.message);
    }
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

export default signIn;
