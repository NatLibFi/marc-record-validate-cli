/* eslint-disable no-await-in-loop */

import {MongoClient} from 'mongodb';
import {MarcRecord} from '@natlibfi/marc-record';
import prompt from 'prompt-promise';
import {logger} from './utils';

export default (client, mongoUrl) => {
	return {
		saveToDb,
		processRecordForRollback,
		revertToPreviousbatchId,
		revertSingleid,
		wipeDatabase
	};

	/**
	* Saves an array or result objects into the database.
	* @param {Array} - res, array of results from validation.
	* @param {string} - batchId
	*/
	async function saveToDb(res, batchId) {
		const entry = res.map(r => {
			return {
				_id: r.id,
				originalRecord: r.originalRecord.toString(),
				validatedRecord: r.validatedRecord.toString(),
				results: r.results,
				updateResponse: r.updateResponse
			};
		});
		const database = await MongoClient.connect(mongoUrl, {useNewUrlParser: true});
		const validateDb = await database.db('validate');
		const result = await validateDb.collection(batchId).insertMany(entry);
		database.close();
		return result;
	}

	/**
	* Takes the current and previous version of a record.
	* @param {Record} - oldRecord
	* @param {Record} - newRecord
	* @returns {Record}
	*/
	function processRecordForRollback(oldRecord, newRecord) {
		const catFields = newRecord.fields.filter(field => field.tag === 'CAT');
		oldRecord.appendField(catFields.pop());
		return oldRecord;
	}

	/**
	* Takes a batch id and reverts all its records into their previous state in
	* the database (if possible).
	* @param { string } - batchId
	*/
	async function revertToPreviousbatchId(batchId) {
		const database = await MongoClient.connect(mongoUrl, {useNewUrlParser: true});
		const validateDb = await database.db('validate');
		const cursor = await validateDb.collection(batchId).find({});
		const count = await cursor.count();
		logger.info(`The batch contains ${count} records to revert.`);
		let results = [];
		while (await cursor.hasNext()) {
			const res = await cursor.next();
			logger.info(`Trying to revert record ${res._id} to its previous state...`);
			const original = MarcRecord.fromString(res.originalRecord);
			const current = await client.loadRecord(res._id);
			const processedRecord = processRecordForRollback(original, current);
			try {
				const result = await client.updateRecord(processedRecord);
				const messages = result.messages.map(m => m.message).join(', ');
				const triggers = result.triggers.map(m => m.message).join(', ');
				const warnings = result.warnings.map(m => m.message).join(', ');
				const errors = result.errors.map(m => m.message).join(', ');
				logger.info(messages);
				if (triggers) {
					logger.info(triggers);
				}
				if (warnings) {
					logger.warn(warnings);
				}
				if (errors) {
					logger.error(errors);
				}
				results.push(result);
			} catch (e) {
				results.push(e);
			}
		}
		database.close();
		return results;
	}

	/**
	* Takes a record id and tries to revert it into its previous state.
	* @param { string } - recordId
	*/
	async function revertSingleid(id) {
		const database = await MongoClient.connect(mongoUrl, {useNewUrlParser: true});
		const validateDb = await database.db('validate');
		const cursor = await validateDb.listCollections();
		while (await cursor.hasNext()) {
			const curr = await cursor.next();
			const resultRecs = await validateDb.collection(curr.name).find({_id: id}).toArray();
			if (resultRecs.length === 1) {
				const original = MarcRecord.fromString(resultRecs.pop().originalRecord);
				logger.info(`Trying to revert record ${id} to its previous state...`);
				const current = await client.loadRecord(id);
				const processedRecord = processRecordForRollback(original, current);
				try {
					const result = await client.updateRecord(processedRecord);
					const messages = result.messages.map(m => m.message).join(', ');
					const triggers = result.triggers.map(m => m.message).join(', ');
					const warnings = result.warnings.map(m => m.message).join(', ');
					const errors = result.errors.map(m => m.message).join(', ');
					logger.info(messages);
					if (triggers) {
						logger.info(triggers);
					}
					if (warnings) {
						logger.warn(warnings);
					}
					if (errors) {
						logger.error(errors);
					}
					return true;
				} catch (e) {
					logger.error(e);
					return false;
				}
			}
		}
		database.close();
		return false;
	}

	/**
	* Deletes all backup data from the MongoDB database.
	*/
	async function wipeDatabase() {
		try {
			const database = await MongoClient.connect(mongoUrl, {useNewUrlParser: true});
			const validateDb = await database.db('validate');
			const cursor = await validateDb.listCollections();
			let totalRecords = 0;
			let totalColls = 0;

			while (await cursor.hasNext()) {
				const curr = await cursor.next();
				const recsInColl = await validateDb.collection(curr.name).find().count();
				totalRecords += recsInColl;
				totalColls++;
			}

			if (totalRecords === 0) {
				logger.info('The database is empty.');
				return false;
			}

			const result = await prompt(`Confirm that you want to erase the database (contains ${totalRecords} records in ${totalColls} collections) (y/n): `);

			if (result === 'y') {
				const dropResult = await validateDb.dropDatabase();
				logger.warn(`Wiped the database (${totalRecords} records in ${totalColls} collections).`);
				return dropResult;
			}

			return false;
		} catch (e) {
			return e;
		}
	}
};
