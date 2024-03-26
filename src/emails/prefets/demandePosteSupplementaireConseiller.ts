import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import service from '../../helpers/services';
import logger from '../../logger';
import { IStructures } from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const templateName = 'demandePosteSupplementaireConseiller';
  const { utils } = mailer;

  const render = async (nomStructure: string) => {
    return mailer.render(__dirname, templateName, {
      nomStructure,
      mail: app.get('smtp').replyTo,
      pilotage: utils.getDashboardUrl('/'),
      pilotagePrefet: utils.getDashboardUrl('/prefet/demandes/conseillers'),
    });
  };

  return {
    render,
    send: async (
      mailPrefet: string,
      structure: IStructures,
      idDemandeCoselec: ObjectId,
    ) => {
      const onSuccess = async () => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: structure._id,
            demandesCoselec: {
              $elemMatch: {
                id: idDemandeCoselec,
              },
            },
          },
          {
            $set: {
              'demandesCoselec.$.prefet.mailSendDatePrefet': new Date(),
            },
            $unset: {
              'demandesCoselec.$.prefet.mailErrorSendDatePrefet': '',
              'demandesCoselec.$.prefet.mailErrorDetailSendDatePrefet': '',
            },
          },
        );
        await app.service(service.misesEnRelation).Model.updateMany(
          {
            'structure.$id': structure._id,
            'structureObj.demandesCoselec': {
              $elemMatch: {
                id: idDemandeCoselec,
              },
            },
          },
          {
            $set: {
              'structureObj.demandesCoselec.$.prefet.mailSendDatePrefet':
                new Date(),
            },
            $unset: {
              'structureObj.demandesCoselec.$.prefet.mailErrorSendDatePrefet':
                '',
              'structureObj.demandesCoselec.$.prefet.mailErrorDetailSendDatePrefet':
                '',
            },
          },
        );
        logger.info(
          `Email envoyé avec succès pour l'information d'une demande de poste(s) supplémentaire(s) au préfet ${mailPrefet}`,
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: structure._id,
            demandesCoselec: {
              $elemMatch: {
                id: idDemandeCoselec,
              },
            },
          },
          {
            $set: {
              'demandesCoselec.$.mailErrorSendDatePrefet': 'smtpError',
              'demandesCoselec.$.mailErrorDetailSendDatePrefet': err.message,
            },
          },
        );
        await app.service(service.misesEnRelation).Model.updateMany(
          {
            'structure.$id': structure._id,
            'structureObj.demandesCoselec': {
              $elemMatch: {
                id: idDemandeCoselec,
              },
            },
          },
          {
            $set: {
              'structureObj.demandesCoselec.$.prefet.mailErrorSendDatePrefet':
                'smtpError',
              'structureObj.demandesCoselec.$.prefet.mailErrorDetailSendDatePrefet':
                err.message,
            },
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(mailPrefet, {
          subject:
            'Conseiller numérique - demande de poste(s) supplémentaire(s)',
          body: await render(structure.nom),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
