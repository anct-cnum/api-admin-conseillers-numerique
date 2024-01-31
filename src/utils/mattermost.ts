import axios from 'axios';
import { Application } from '@feathersjs/express';
import { action } from '../helpers/accessControl/accessList';
import service from '../helpers/services';
import {
  IDepartement,
  IMattermost,
  IRequest,
} from '../ts/interfaces/global.interfaces';
import { IConseillers, IStructures } from '../ts/interfaces/db.interfaces';
import getHubByStructure from '../services/hubs/hubs.repository';

const slugify = require('slugify');
const departements = require('../../datas/imports/departements-region.json');

slugify.extend({ '-': ' ' });
slugify.extend({ "'": ' ' });

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

const getChannel =
  (app: Application) => async (idTeam: string, channelName: string) => {
    const mattermost = app.get('mattermost');
    try {
      const token = await loginApi({ mattermost });
      const channel = await axios({
        method: 'get',
        url: `${mattermost.endPoint}/api/v4/teams/${idTeam}/channels/name/${channelName}`,
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

const deleteJoinTeam =
  (app: Application) => async (idTeam: string, idUser: string) => {
    const mattermost = app.get('mattermost');
    try {
      const token = await loginApi({ mattermost });
      await axios({
        method: 'delete',
        url: `${mattermost.endPoint}/api/v4/teams/${idTeam}/members/${idUser}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  };

const joinTeam =
  (app: Application) => async (idTeam: string, idUser: string) => {
    const mattermost = app.get('mattermost');
    try {
      const token = await loginApi({ mattermost });
      await axios({
        method: 'post',
        url: `${mattermost.endPoint}/api/v4/teams/${idTeam}/members`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          user_id: idUser,
          team_id: idTeam,
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  };

const transfertChannelDepartementConseiller =
  (app: Application, mattermost: IMattermost) =>
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
    const channelNouvelleSA = await getChannel(app)(
      mattermost.teamId,
      channelNameNouvelleSA,
    );
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
    const channelAncienneSA = await getChannel(app)(
      mattermost.teamId,
      channelNameAncienneSA,
    );
    await deleteMemberChannel(app)(
      channelAncienneSA.id,
      conseiller.mattermost.id,
    );
  };

const transfertChannelHubConseiller =
  (app: Application, req: IRequest, mattermost: IMattermost) =>
  async (
    structureDestination: IStructures,
    ancienneStructure: IStructures,
    conseiller: IConseillers,
  ) => {
    const hubNouvelleSA = await getHubByStructure(
      app,
      req,
    )(structureDestination);
    const hubAncienneSA = await getHubByStructure(app, req)(ancienneStructure);
    if (
      hubAncienneSA !== null &&
      hubAncienneSA?.channelId !== hubNouvelleSA?.channelId
    ) {
      deleteMemberChannel(app)(
        hubAncienneSA.channelId,
        conseiller.mattermost.id,
      );

      if (hubNouvelleSA === null) {
        await deleteJoinTeam(app)(
          mattermost.hubTeamId,
          conseiller.mattermost.id,
        );
        await app
          .service(service.conseillers)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            { _id: conseiller._id },
            {
              $unset: { 'mattermost.hubJoined': '' },
            },
          );
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany(
            { 'conseiller.$id': conseiller._id },
            {
              $unset: { 'conseillerObj.mattermost.hubJoined': '' },
            },
          );
      }
    }
    if (
      hubNouvelleSA !== null &&
      hubAncienneSA?.channelId !== hubNouvelleSA?.channelId
    ) {
      await joinTeam(app)(mattermost.hubTeamId, conseiller.mattermost.id);
      await joinChannel(app)(hubNouvelleSA.channelId, conseiller.mattermost.id);
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: conseiller._id },
          {
            $set: { 'mattermost.hubJoined': true },
          },
        );
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'conseiller.$id': conseiller._id },
          {
            $set: { 'conseillerObj.mattermost.hubJoined': true },
          },
        );
    }
  };

export {
  deleteAccount,
  transfertChannelDepartementConseiller,
  transfertChannelHubConseiller,
};
