import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const getUsers = (app: Application) => async (req: IRequest, res: Response) => {
  try {
    const user: IUser[] | IUser = await app
      .service(service.users)
      .Model.accessibleBy(req.ability, action.read)
      .find({})
      .select({ name: 1, passwordCreated: 1 });
    res.status(200).json(user);
  } catch (error) {
    throw new Error(error);
  }
};

export default getUsers;
