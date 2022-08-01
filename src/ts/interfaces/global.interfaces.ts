import { IUser } from './db.interfaces';

export interface IRequest extends Request {
	ability: any;
	user?: IUser;
}
