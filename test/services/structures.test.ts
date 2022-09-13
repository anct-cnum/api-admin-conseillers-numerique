import app from '../../src/app';

describe("'structures' service", () => {
	it('registered the service', () => {
		const service = app.service('structures');
		expect(service).toBeTruthy();
	});
});
