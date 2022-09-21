import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';

const getUsersByStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    try {
      const user: IUser[] | IUser = await app
        .service(service.users)
        .Model.aggregate([
          {
            $match: { 'entity.$id': new ObjectId(idStructure) },
          },
          { $project: { name: 1, passwordCreated: 1 } },
        ]);
      res.status(200).json(user);
    } catch (error) {
      throw new Error(error);
    }
  };

export default getUsersByStructure;
