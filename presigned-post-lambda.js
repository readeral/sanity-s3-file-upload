import S3 from 'aws-sdk/clients/s3';
import mime from 'mime';
import cryptoRandomString from 'crypto-random-string';

export default async function(event, context, callback) {
	const {name, bucket} = JSON.parse(event.body);
	const [error, response] = await sendPresignedPost(createPresignedPost, {
		bucket,
		name
	});

	callback(error, response);
}

function createPresignedPost(params) {
	const s3 = new S3();
	return new Promise((resolve, reject) => {
		s3.createPresignedPost(params, (err, data) => {
			if (err) {
				reject(err);
			}

			resolve(data);
		});
	});
}

async function sendPresignedPost(createPresignedPost, {bucket, name}) {
	const contentType = mime.getType(name);
	const key = `${cryptoRandomString({length: 16, type: 'url-safe'})}_${name}`;

	const params = {
		Expires: 60,
		Bucket: bucket,
		Conditions: [['content-length-range', 100, 100000000]],
		Fields: {
			'Content-Type': contentType,
			key
		}
	};

	try {
		const presignedPostData = await createPresignedPost(params);

		const response = {
			statusCode: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Credentials': false
			},
			body: JSON.stringify({
				error: false,
				data: presignedPostData,
				message: null
			})
		};

		return [null, response];
	} catch (error) {
		return [error];
	}
}
