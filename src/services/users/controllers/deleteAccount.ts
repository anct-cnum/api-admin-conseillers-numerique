import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

const checkIfUserIsContactStructure =
  (app: Application, req: IRequest) => async (idUser: string) => {
    const user = await app
      .service(service.users)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ _id: new ObjectId(idUser) })
      .select({ name: 1, _id: 0 });
    const structure = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .countDocuments({
        'contact.email': user.name,
      });
    if (structure > 0) {
      return true;
    }
    return false;
  };

const deleteAccount =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idUser = req.params.id;
    const { roleSuppression } = req.query;
    let user: undefined | IUser;
    try {
      if (roleSuppression === 'tous') {
        const isContactStructure = await checkIfUserIsContactStructure(
          app,
          req,
        )(idUser);
        if (isContactStructure) {
          return res.status(409).json({
            message:
              "le gestionnaire ne peut pas perdre son rôle structure, il s'agit du compte principal de la structure",
          });
        }
        await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.delete)
          .deleteOne({ _id: new ObjectId(idUser) });
      } else {
        let query = {};
        switch (roleSuppression) {
          case 'grandReseau':
            query = {
              $unset: {
                reseau: '',
              },
              $pull: {
                roles: 'grandReseau',
              },
            };
            break;
          case 'structure':
            // eslint-disable-next-line no-case-declarations
            const isContactStructure = await checkIfUserIsContactStructure(
              app,
              req,
            )(idUser);
            if (isContactStructure) {
              return res.status(409).json({
                message:
                  "le gestionnaire ne peut pas perdre son rôle structure, il s'agit du compte principal de la structure",
              });
            }
            query = {
              $unset: {
                entity: '',
              },
              $pull: {
                roles: { $in: ['structure', 'structure_coop'] },
              },
            };
            break;
          case 'prefet':
            query = {
              $unset: {
                departement: '',
                region: '',
              },
              $pull: {
                roles: 'prefet',
              },
            };
            break;
          case 'hub_coop':
            query = {
              $unset: {
                hub: '',
              },
              $pull: {
                roles: 'hub_coop',
              },
            };
            break;
          case 'admin':
            query = {
              $pull: {
                roles: { $in: ['admin', 'admin_coop'] },
              },
            };
            break;
          default:
            return res.status(409).json({ message: 'le rôle est invalide' });
        }
        user = await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate({ _id: new ObjectId(idUser) }, query, {
            new: true,
          });
      }
      user.sub = 'xxxxxxxxx';
      return res.status(200).json({ deleteSuccess: true, idUser, user });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default deleteAccount;
