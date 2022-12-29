import axios from 'axios';
import { action } from '../helpers/accessControl/accessList';
import service from '../helpers/services';

const loginApi = async ({ mattermost }) => {
  const resultLogin = await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/users/login`,
    headers: {
      'Content-Type': 'application/json',
    },
    data: { login_id: mattermost.login, password: mattermost.password },
  });

  return resultLogin.request.res.headers.token;
};

const deleteAccount = (app, req) => async (conseiller) => {
  const mattermost = app.get('mattermost');
  try {
    const token = await loginApi({ mattermost });

    // Query parameter permanent pour la suppression définitive (il faut que le paramètre ServiceSettings.EnableAPIUserDeletion soit configuré à true)
    await axios({
      method: 'delete',
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}?permanent=true`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    await app
      .service(service.conseillers)
      .Model.accessibleBy(req.ability, action.update)
      .updateOne(
        { _id: conseiller._id },
        {
          $set: { 'mattermost.errorDeleteAccount': false },
        },
      );
  } catch (error) {
    await app
      .service(service.conseillers)
      .Model.accessibleBy(req.ability, action.update)
      .updateOne(
        { _id: conseiller._id },
        {
          $set: { 'mattermost.errorDeleteAccount': true },
        },
      );
    throw new Error(error);
  }
};

export default deleteAccount;
