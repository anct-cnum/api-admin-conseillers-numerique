import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationAvenant } from '../../../schemas/structures.schemas';
import getDetailStructureById from './getDetailStructureById';
import { PhaseConventionnement } from '../../../ts/enum';
import { checkStructurePhase2 } from '../repository/structures.repository';
import { getCoselec } from '../../../utils';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { demandePosteSupplementaireConseiller } from '../../../emails';

const createAvenant =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: { type, nombreDePostes, motif, estPosteCoordinateur },
      params: { id },
    } = req;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    const createAvenantValidation = validCreationAvenant.validate({
      type,
      nombreDePostes,
      motif,
      estPosteCoordinateur,
    });

    if (createAvenantValidation.error) {
      res.status(400).json({ message: createAvenantValidation.error.message });
      return;
    }

    const getStructure = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne();

    if (!getStructure) {
      res.status(404).json({ message: "La structure n'existe pas" });
      return;
    }

    const phaseConventionnement = checkStructurePhase2(
      getStructure?.conventionnement?.statut,
    )
      ? PhaseConventionnement.PHASE_2
      : PhaseConventionnement.PHASE_1;

    if (
      type === 'ajout' &&
      phaseConventionnement === PhaseConventionnement.PHASE_1
    ) {
      res
        .status(400)
        .json({ message: `Impossible d'ajouter des postes en phase 1` });
      return;
    }

    if (getStructure.demandesCoselec?.length > 0) {
      const demandeCoselec = getStructure.demandesCoselec.pop();
      if (demandeCoselec?.statut === 'en_cours') {
        res.status(409).json({
          message: `Une demande est en cours d'instruction. Vous ne pouvez faire aucune action pendant cette période.`,
        });
        return;
      }
    }

    if (
      getStructure.demandesCoordinateur.filter(
        (poste) =>
          poste.statut === 'validee' &&
          !poste?.estRendu &&
          !poste.miseEnRelationId,
      ).length === 0 &&
      estPosteCoordinateur
    ) {
      res.status(409).json({
        message: `Le retrait d’un poste coordinateur n’est pas autorisé avant la déclaration de la rupture.`,
      });
      return;
    }
    const demandeCoselec = {
      id: new ObjectId(),
      ...(type === 'retrait'
        ? { nombreDePostesRendus: nombreDePostes }
        : { nombreDePostesSouhaites: nombreDePostes }),
      motif,
      emetteurAvenant: { date: new Date(), email: req.user?.name },
      type,
      statut: 'en_cours',
      banniereValidationAvenant: false,
      phaseConventionnement,
      nbPostesAvantDemande:
        getCoselec(getStructure).nombreConseillersCoselec ?? 0,
      ...(estPosteCoordinateur ? { estPosteCoordinateur } : {}),
    };

    try {
      const updateStructure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: new ObjectId(id) },
          { $push: { demandesCoselec: demandeCoselec } },
        );

      if (updateStructure.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "La structure n'a pas été mise à jour" });
        return;
      }

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          { 'structure.$id': new ObjectId(id) },
          { $push: { 'structureObj.demandesCoselec': demandeCoselec } },
        );

      if (type === 'ajout') {
        const prefets: IUser[] = await app
          .service(service.users)
          .Model.find({
            roles: { $in: ['prefet'] },
            departement: getStructure.codeDepartement,
          })
          .select({ _id: 0, name: 1 });
        if (prefets.length > 0) {
          const mailerInstance = mailer(app);
          const promises: Promise<void>[] = [];
          const messageDemandePosteConseiller =
            demandePosteSupplementaireConseiller(app, mailerInstance);
          await prefets.forEach(async (prefet) => {
            // eslint-disable-next-line no-async-promise-executor
            const p = new Promise<void>(async (resolve, reject) => {
              const errorSmtpMailDemandePoste =
                await messageDemandePosteConseiller
                  .send(prefet.name, getStructure)
                  .catch((errSmtp: Error) => {
                    return errSmtp;
                  });
              if (errorSmtpMailDemandePoste instanceof Error) {
                reject();
                return;
              }
              resolve(p);
            });
            promises.push(p);
          });
          await Promise.allSettled(promises);
        }
      }

      await getDetailStructureById(app)(req, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default createAvenant;
