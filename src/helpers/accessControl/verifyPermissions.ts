import { ForbiddenError } from '@casl/ability';

const mailSendingPermission = (ability) =>
	ForbiddenError.from(ability)
		.setMessage("Accès à l'envoi de mails refusé")
		.throwUnlessCan('send', 'email');

export default mailSendingPermission;
