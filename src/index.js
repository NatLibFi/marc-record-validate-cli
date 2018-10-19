import * as yargs from 'yargs';
import * as _ from 'lodash';
import fs from 'fs';
import MelindaClient from '@natlibfi/melinda-api-client';
import createValidateFunction from './validate';
import {logger} from './utils';
import createDb from './db';
import createOperations from './operations';

run();

async function run() {
	const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/';
	const client = new MelindaClient({
		endpoint: process.env.MELINDA_API,
		user: process.env.MELINDA_API_USERNAME,
		password: process.env.MELINDA_API_PASSWORD
	});

	const {saveToDb, revertToPrevious, wipeDatabase, revertSingle} = createDb(client, mongoUrl);
	const {
		show,
		validateRecord,
		fix,
		fileFix,
		saveLocally,
		isValid,
		formatResults,
		generateBatchId,
		isWithinTimeinterval,
		sleep
	} = createOperations(await createValidateFunction(), client);

	/**
	* Parse the command-line arguments.
	*/
	const argv = yargs
		.usage('Usage: <options>')
		.help('h')
		.alias('h', 'help')
		.alias('s', 'show')
		.describe('s', 'Show a single record')
		.alias('v', 'validate')
		.describe('v', 'Validate a single record')
		.alias('f', 'fix')
		.describe('f', 'Fix a single record')
		.alias('l', 'localfix')
		.describe('l', 'Fix a single record from the API, save the result locally')
		.alias('x', 'filefix')
		.describe('x', 'Validate and fix a set of records from local file, save results locally')
		.alias('m', 'fixmultiple')
		.describe('m', 'Read record ids from file, fix all')
		.option('c', {
			alias: 'chunksize',
			demandOption: false,
			default: 5,
			describe: 'OPTIONAL: The size of the chunks to process with fixmultiple',
			type: 'number'
		})
		.option('t', {
			alias: 'timeinterval',
			demandOption: false,
			describe: 'OPTIONAL: The timeframe in a day in which long-running fixmultiple jobs are run (e.g. 17-06)',
			type: 'string'
		})
		.alias('u', 'undo')
		.describe('u', 'Revert a single record to its previous version')
		.alias('b', 'undobatch')
		.describe('b', 'Revert a batch of records into their previous state')
		.alias('r', 'reset')
		.describe('r', 'Reset the local database, wipe all backup data.')
		.argv;

	try {
		/**
		* Process command-line arguments.
		*/

		if (argv.x) {
			const file = argv.x;
			logger.info(`Validating records from file ${file}.`);

			const res = await fileFix(file);
			logger.info(`action: fileFix, inputfile: ${argv.x}, outputfile: ${res.outputFile}, processed recs: ${res.processedRecs}`);
		}

		if (argv.r) {
			await wipeDatabase();
			logger.info('Success.');
		}

		if (argv.s) {
			// Show a single record.
			checkEnvVars();
			const record = await show(argv.s);
			console.log(record);
		}

		if (argv.v || argv.l) {
			checkEnvVars(true);
			// Validate a single record without updating the db.
			const id = argv.v ? argv.v : argv.l;
			logger.info(`Validating record ${id}`);
			const validationResult = await validateRecord(id);

			logger.info('Validated record:');
			console.log(validationResult.validatedRecord.toString());
			console.log('\n' + formatResults(validationResult.results));

			if (argv.l) {
				let saveResult = await saveLocally(validationResult.validatedRecord, '_validated');
				logger.info(saveResult);

				saveResult = await saveLocally(validationResult.originalRecord, '_original');
				logger.info(saveResult);
			}
		} else if (argv.f) {
			checkEnvVars(true);
			let id = argv.f.toString();
			const parsedId = '0'.repeat(9 - id.length) + id; // Yargs removes the leading zeros from number arguments
			const result = await fix(parsedId);

			afterSuccessfulUpdate(result);

			const batchId = generateBatchId();
			logger.info(`Saving update results of record ${parsedId} to db with batchId '${batchId}'...`);

			try {
				await saveToDb([result], batchId);
				logger.info('Success.');
			} catch (err) {
				logger.error(`Updating record ${id} failed: '${err.errors ? err.errors.map(e => e.message).join(', ') : err}'`);
			}
		} else if (argv.m) {
			checkEnvVars(true);
			// Read multiple record ids from file, validate and fix.
			const file = argv.m;

			if (!fs.existsSync(file)) {
				throw new Error(`File ${file} does not exist.`);
			}

			const ids = fs.readFileSync(file, 'utf8')
				.split('\n')
				.map(id => id.trim())
				.filter(id => isValid(id));

			if (ids.length < 1) {
				throw new Error('File does not contain valid record ids.');
			}

			const chunk = argv.c || 5;

			logger.info(`Read ${ids.length} record ids from file ${argv.m}, fixing them in chunks of ${chunk}.`);

			const idSets = _.chunk(ids, chunk);
			const batchId = generateBatchId();

			await fixAll(idSets, ids.length, batchId);
		} else if (argv.b) {
			checkEnvVars();
			logger.info(`Performing a rollback from batch with id '${argv.b}'...`);
			await revertToPrevious(argv.b);
			logger.info('Success.');
		} else if (argv.u) {
			checkEnvVars();
			let id = argv.u.toString();
			const parsedId = '0'.repeat(9 - id.length) + id; // Yargs removes the leading zeros from number arguments

			if (!isValid(parsedId)) {
				throw new Error(`'${parsedId} is not a valid record id.'`);
			}

			const result = await revertSingle(parsedId);

			if (result) {
				logger.info('Success.');
			} else {
				logger.warn(`Record ${parsedId} was not found in the backup database.`);
				process.exit(-1);
			}
		}

		process.exit();
	} catch (err) {
		logger.error(err.stack);
		process.exit(-1);
	}

	/*
	* Check whether the enviroment variables necessary for the operation are set.
	* @param {boolean} - creds
	* @returns {boolean}
	*/
	function checkEnvVars(creds = 'false') {
		if (!process.env.MELINDA_API) {
			throw new Error('The environment variable MELINDA_API is not set.');
		}

		if (creds && (!process.env.MELINDA_API_USERNAME || !process.env.MELINDA_API_PASSWORD)) {
			throw new Error('Environment variable(s) MELINDA_API_USERNAME and/or MELINDA_API_PASSWORD are not set.');
		}

		return true;
	}

	function afterSuccessfulUpdate(res, batchId = '') {
		const {originalRecord, updateResponse, validatedRecord, results} = res;
		const message = _.map(updateResponse.messages, 'message').join('\n');
		const id = originalRecord.get('001')[0].value;
		console.log(`${message}
==============
Record ${id} after validation:

${validatedRecord.toString()}

${formatResults(results)}`);

		let action = argv.m ? 'fixmultiple' : 'fix';
		logger.info(`id: ${id}, action: ${action}${argv.m ? ' (chunksize: ' + argv.c + ', batchId: ' + batchId + '),' : ''}`);
	}

	/**
		* Fix a batch of records. Calls itself recursively until all chunks are processed.
		* @param {array} - idChunks - A list of lists of ids. E.g. [[1, 2, 3], [4, 5, 6]].
		* @param {number} - total - The total number of records to process.
		* @returns {Promise} - Resolves with true when everything is processed. Logs errors in the process.
		*/
	async function fixAll(idChunks, total, batchId) {
		if (!isWithinTimeinterval(argv.t)) { // eslint-disable-line no-negated-condition
			const date = new Date();
			const currTime = `${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`;

			logger.info(`Current time (${currTime}) is not within the time limits (${argv.t}) to run. Sleeping for 20 minutes...`);

			await sleep(60000 * 20); // Sleep for 20 minutes and recur
			fixAll(idChunks, total, batchId);
		} else {
			const [head, ...tail] = idChunks;

			if (!head) {
				logger.info('Done.');
				return 'Done';
			}

			const results = await Promise.all(head.map(async id => {
				try {
					let res = await fix(id);
					res.results.id = id;
					afterSuccessfulUpdate(res, batchId);
					return res;
				} catch (err) {
					const errorMessage = `Updating record ${id} failed: '${err}'`;
					logger.error(errorMessage);
				}
			}));

			saveToDb(results, batchId).then(dbResults => {
				logger.info(`Saved ${dbResults.insertedCount} records to database: ${Object.values(dbResults.insertedIds).join(', ')} with batchId '${batchId}.'`);
			}).catch(err => logger.error(err));

			const done = total - (head.length * tail.length);

			logger.info(`${done}/${total} (${Math.round(done / total * 100)} %) records processed.`);
			fixAll(tail, total, batchId);
		}
	}
}
