import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const deleteAccountGrandReseau =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idUser = req.params.id;
    try {
      if (
        req.user?.roles.length > 1 &&
        req.user?.roles.includes('grandReseau')
      ) {
        await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            { _id: new ObjectId(idUser) },
            {
              $unset: {
                reseau: '',
              },
              $pull: {
                roles: 'grandReseau',
              },
            },
          );
      } else {
        await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.delete)
          .deleteOne({ _id: new ObjectId(idUser) });
      }
      res.status(200).json({ deleteSuccess: true, idUser });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default deleteAccountGrandReseau;
