import { Service, MongooseServiceOptions  } from 'feathers-mongoose';

export default class MisesEnRelation extends Service {
  constructor(options: Partial<MongooseServiceOptions>) {
    super(options);

  }
}
