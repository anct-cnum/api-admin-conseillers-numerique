import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { authenticate } from '@feathersjs/express';
import { Application } from '../../declarations';
import getConseillers from './controllers/getConseillers';
import createAbilities from '../../middleware/createAbilities';

export default class Conseillers extends Service {
}
