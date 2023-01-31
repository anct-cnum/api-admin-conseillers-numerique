import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const deleteAccount =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idUser = req.params.id;
    try {
      // xxx pour le moment on n'autorise que les admins à supprimer un user
      // à voir : suppression d'un rôle et non du user complet si multi rôle
      await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.delete)
        .deleteOne({
          _id: new ObjectId(idUser),
          roles: { $all: ['admin'] },
        });
      res.status(200).json({ deleteSuccess: true, idUser });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default deleteAccount;
