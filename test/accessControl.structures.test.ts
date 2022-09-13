const assert = require('assert') ;
const request = require('supertest');
const { DBRef, ObjectId } = require('mongodb');
import app from '../src/app';

describe("'users' service", () => {
	it('registered the service', () => {
		const service = app.service('users');

		assert.ok(service, 'Registered the service');
	});

	describe('local strategy', () => {
		const userInfo = {
			name: 'structure@example.fr',
			password: 'supersecret',
		};

		beforeAll(async () => {
			try {
				await app.service('users').create({
					...userInfo,
					roles: ['structure'],
					entity: new DBRef(
						'structures',
						new ObjectId('60461fad871498b5cec2028e'),
						'bwpnvys3yebazesqg4wh',
					),
				});
			} catch (error) {
				// Do nothing, it just means the user already exists and can be tested
			}
		});

		it('authenticates a structure and creates accessToken', async () => {
			const { accessToken } = await app.service('authentication').create({
				strategy: 'local',
				...userInfo,
			});
			const { body, statusCode } = await request(app)
				.get('/custom-route-get')
				.send({ roleActivated: 'structure' })
				.set('Authorization', `Bearer ${accessToken}`);
			console.log(body, statusCode);
		});
		// it('update a structure', async () => {
		// 	const { accessToken } = await app.service('authentication').create({
		// 		strategy: 'local',
		// 		...userInfo,
		// 	});
		// 	const id = '62d426a3173db91a679dc9d6';
		// 	const { body, statusCode } = await request(app)
		// 		.patch(`/custom-route-update/${id}`)
		// 		.send({ name: 'updatedMailv3@example.fr' })
		// 		.set('Authorization', `Bearer ${accessToken}`);
		// 	console.log(body, statusCode);
		// });
	});
});
