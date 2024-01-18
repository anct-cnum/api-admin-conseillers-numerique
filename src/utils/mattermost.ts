import axios from 'axios';
import { Application } from '@feathersjs/express';
import { action } from '../helpers/accessControl/accessList';
import service from '../helpers/services';
import { IDepartement, IRequest } from '../ts/interfaces/global.interfaces';
import { IConseillers, IStructures } from '../ts/interfaces/db.interfaces';

const slugify = require('slugify');
const departements = require('../../datas/imports/departements-region.json');

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

const deleteAccount =
  (app: Application, req: IRequest) => async (conseiller: IConseillers) => {
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

const joinChannel =
  (app: Application) => async (idChannel: string, idUser: string) => {
    const mattermost = app.get('mattermost');
    try {
      const token = await loginApi({ mattermost });
      await axios({
        method: 'post',
        url: `${mattermost.endPoint}/api/v4/channels/${idChannel}/members`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          user_id: idUser,
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  };

const deleteMemberChannel =
  (app: Application) => async (idChannel: string, idUser: string) => {
    const mattermost = app.get('mattermost');
    try {
      const token = await loginApi({ mattermost });
      await axios({
        method: 'delete',
        url: `${mattermost.endPoint}/api/v4/channels/${idChannel}/members/${idUser}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  };

const getChannel = (app: Application) => async (channelName: string) => {
  const mattermost = app.get('mattermost');
  try {
    const token = await loginApi({ mattermost });
    const channel = await axios({
      method: 'get',
      url: `${mattermost.endPoint}/api/v4/teams/${mattermost.teamId}/channels/name/${channelName}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return channel.data;
  } catch (error) {
    throw new Error(error);
  }
};

const transfertChannelDepartementConseiller =
  (app: Application) =>
  async (
    structureDestination: IStructures,
    ancienneStructure: IStructures,
    conseiller: IConseillers,
  ) => {
    let departementAncienneSA: IDepartement = departements.find(
      (departement) =>
        `${departement.num_dep}` === ancienneStructure.codeDepartement,
    );
    let departementNouvelleSA: IDepartement = departements.find(
      (departement) =>
        `${departement.num_dep}` === structureDestination.codeDepartement,
    );
    if (
      structureDestination.codeDepartement === '00' &&
      structureDestination.codePostal === '97150'
    ) {
      departementNouvelleSA = departements.find(
        (departement) => `${departement.num_dep}` === '971',
      );
    }
    const channelNameNouvelleSA = slugify(departementNouvelleSA.dep_name, {
      replacement: '',
      lower: true,
    });
    const channelNouvelleSA = await getChannel(app)(channelNameNouvelleSA);
    await joinChannel(app)(channelNouvelleSA.id, conseiller.mattermost.id);
    if (
      ancienneStructure.codeDepartement === '00' &&
      ancienneStructure.codePostal === '97150'
    ) {
      departementAncienneSA = departements.find(
        (departement) => `${departement.num_dep}` === '971',
      );
    }
    const channelNameAncienneSA = slugify(departementAncienneSA.dep_name, {
      replacement: '',
      lower: true,
    });
    const channelAncienneSA = await getChannel(app)(channelNameAncienneSA);
    await deleteMemberChannel(app)(
      channelAncienneSA.id,
      conseiller.mattermost.id,
    );
  };

export { deleteAccount, transfertChannelDepartementConseiller };
