import crypto from 'crypto';
import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { NotFound, Forbidden } from '@feathersjs/errors';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';

const getCandidatCV =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      // Verification rôle candidat / structure / admin pour accéder au CV : si candidat alors il ne peut avoir accès qu'à son CV
      const userId = req.user._id;
      if (!ObjectId.isValid(userId)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const user = await app
        .service(service.users)
        .Model.findOne({ _id: new ObjectId(userId) });
      if (
        !(
          user?.roles.includes('candidat') &&
          req.params.id.toString() === user?.entity.oid.toString()
        ) &&
        !user?.roles.includes('structure') &&
        !user?.roles.includes('admin')
      ) {
        res.status(403).send(
          new Forbidden('User not authorized', {
            userId,
          }).toJSON(),
        );
        return;
      }

      // Verification existence du conseiller associé
      const conseiller = await app
        .service(service.conseillers)
        .Model.findOne({ _id: new ObjectId(req.params.id) });

      if (conseiller === null) {
        res.status(404).send(
          new NotFound('Conseiller not found', {
            conseillerId: user.entity.oid,
          }).toJSON(),
        );
        return;
      }

      // Verification existence CV du conseiller
      if (!conseiller.cv?.file) {
        res.status(404).send(
          new NotFound("Le CV du conseiller n'existe plus", {
            conseillerId: user.entity.oid,
          }).toJSON(),
        );
        return;
      }

      // Récupération du CV crypté
      const awsConfig = app.get('aws');
      const client = new S3Client({
        region: awsConfig.region,
        credentials: {
          accessKeyId: awsConfig.access_key_id,
          secretAccessKey: awsConfig.secret_access_key,
        },
        endpoint: awsConfig.endpoint,
      });

      const params = {
        Bucket: awsConfig.cv_bucket,
        Key: conseiller.cv.file,
      };
      const command = new GetObjectCommand(params);
      const fileS3 = await client
        .send(command)
        .then(async (data) => {
          // Dechiffrement du CV (le buffer se trouve dans data.Body)
          const cryptoConfig = app.get('crypto');
          const key = crypto
            .createHash('sha256')
            .update(cryptoConfig.key)
            .digest('base64')
            .substring(0, 32);
          const file = await data.Body.transformToByteArray();
          if (file.length === 0) {
            return new Error('Le CV du conseiller est vide');
          }
          // @ts-ignore: Unreachable code error
          const iv = file.slice(0, 16);
          // @ts-ignore: Unreachable code error
          const decipher = crypto.createDecipheriv(
            cryptoConfig.algorithm,
            key,
            iv,
          );
          const bufferDecrypt = Buffer.concat([
            // @ts-ignore: Unreachable code error
            decipher.update(file.slice(16)),
            decipher.final(),
          ]);

          return bufferDecrypt;
        })
        .catch(() => {
          throw new Error('Erreur lors de la récupération du CV');
        });
      if (fileS3 instanceof Error) {
        res.status(500).json({ message: fileS3.message });
        return;
      }
      res.send(fileS3);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getCandidatCV;
