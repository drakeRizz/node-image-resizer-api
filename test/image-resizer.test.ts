import chai from 'chai';
import chaiHttp = require('chai-http');
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import app from '../src/app';
import ImageResizer from '../src/misc/image_resizer';

chai.use(chaiHttp);

const expect = chai.expect;

let image: Buffer;

before(function setup() {
	this.timeout(0);
	// Grab a random image from the internet
	return chai.request('https://picsum.photos')
		.get('/1024')
		.then((response) => {
			image = response.body;
			fs.writeFileSync(path.join(ImageResizer.imagesPath, 'test.jpg'), image);
		});
});

describe('Image resizer', () => {

	it('should return the resized image at 500x500', () => {
		const size = '500x500';
		return chai.request(app).get(`/image/test.jpg?size=${size}`)
			.then((res) => {
				expect(res.status).to.eql(200);
				expect(res.type).to.eql('image/jpg');
				expect(typeof (res.body))
					.to.equal('object', `Expected type of response body to be an object, but was ${typeof (res.body)}`);
				sharp(res.body).metadata().then(info => {
					const [width, height] = size.split('x').map(x => parseInt(x));
					expect(info.width).to.equal(width, `Expected width to be ${width} but was ${info.width}`);
					expect(info.height).to.equal(height, `Expected height to be ${height} but was ${info.height}`);
				});
			});
	});

	it('should return the original image', () => {
		return chai.request(app).get(`/image/test.jpg`)
			.then((res) => {
				expect(res.status).to.eql(200);
				expect(res.type).to.eql('image/jpg');
				expect(typeof (res.body))
					.to.equal('object', `Expected type of response body to be an object, but was ${typeof (res.body)}`);
				sharp(image).metadata().then(originalImageInfo => {
					const { width, height, format } = originalImageInfo;
					sharp(res.body).metadata().then(newImageInfo => {
						expect(newImageInfo.width).to.equal(width, `Expected width to be ${width} but was ${newImageInfo.width}`);
						expect(newImageInfo.height).to.equal(height, `Expected height to be ${height} but was ${newImageInfo.height}`);
						expect(newImageInfo.format).to.equal(format, `Expected height to be ${format} but was ${newImageInfo.format}`);
					});
				});

			});
	});

	it('should fail if invalid size provided', () => {
		return chai.request(app).get('/image/test.jpg?size=zzz')
			.then((res) => {
				expect(res.status).to.eql(500);
				expect(res.text).to.contain('Invalid picture size');
			});
	});

	it('should return 404 if image is not existing', () => {
		return chai.request(app).get('/image/this_does_not_exist.jpg')
			.then((res) => {
				expect(res.status).to.eql(404);
				expect(res.text).to.contain('Image not found');
			});
	});

});
