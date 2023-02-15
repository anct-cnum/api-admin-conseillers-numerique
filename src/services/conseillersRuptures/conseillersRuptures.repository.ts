import dayjs from 'dayjs';
import { Response } from 'express';

const formatDate = (date: Date) => {
  if (date !== undefined && date !== null) {
    return dayjs(new Date(date.getTime() + 120 * 60000)).format('DD/MM/YYYY');
  }
  return 'non renseignée';
};

const generateCsvHistoriqueRuptures = async (ruptures: any, res: Response) => {
  res.write(
    'Id CnFS;Nom CnFS;Prénom CnFS;Email CnFS;Id Structure;Nom Structure;Date de rupture du contrat;Motif de rupture;Commentaire\n',
  );
  try {
    await Promise.all(
      ruptures.map(async (rupture) => {
        res.write(
          `${
            rupture.conseiller?.idPG ??
            rupture.conseillerSupprime?.conseiller?.idPG
          };${rupture.conseiller?.nom ?? 'Anonyme'};${
            rupture.conseiller?.prenom ?? 'Anonyme'
          };${rupture.conseiller?.email ?? 'Anonyme'};${
            rupture.structure?.idPG
          };${rupture.structure?.nom};${formatDate(rupture.dateRupture)};${
            rupture.motifRupture
          };${
            rupture.conseillerSupprime?.conseiller?.idPG
              ? "Ce conseiller s'est désinscrit totalement du dispositif"
              : ''
          }\n`,
        );
      }),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

// eslint-disable-next-line import/prefer-default-export
export { generateCsvHistoriqueRuptures };
