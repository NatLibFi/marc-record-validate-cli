import { MongoClient } from 'mongodb';
import Serializers from 'marc-record-serializers';
import Record from 'marc-record-js';
import prompt from 'prompt-promise';
import { client } from './config';
import { processRecordForRollback } from './operations.js';
import { logger } from './cli.js';
const mongoUrl = 'mongodb://localhost:27017/';

/**
 * Saves an array or result objects into the database.
 * @param {Array} - res, array of results from validation.
 * @param {string} - batchId
 */
export async function saveToDb(res, batchId) {
  try {
    const entry = res.map(r => {
        return {
          _id: r.id,
          originalRecord: r.originalRecord.toString(),
          validatedRecord: r.validatedRecord.toString(),
          results: r.results,
          updateResponse: r.updateResponse
        }
    });
    const database = await MongoClient.connect(mongoUrl);
    const validateDb = await database.db('validate');
    const result = await validateDb.collection(batchId).insertMany(entry);
    database.close();
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * Takes a batch id and reverts all its records into their previous state in
 * the database (if possible).
 * @param { string } - batchId
 */
export async function revertToPrevious(batchId) {
  const database = await MongoClient.connect(mongoUrl);
  const validateDb = await database.db('validate');
  const cursor = await validateDb.collection(batchId).find({});
  const count = await cursor.count();
  logger.info(`The batch contains ${count} records to revert.`);
  let results = [];
  while (await cursor.hasNext()) {
    const res = await cursor.next();
    logger.info(`Trying to revert record ${res._id} to its previous state...`);
    const original = Record.fromString(res.originalRecord);
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
 * Deletes all backup data from the MongoDB database.
 */
export async function wipeDatabase() {
  try {
    const database = await MongoClient.connect(mongoUrl);
    const validateDb = await database.db('validate');
    const cursor = await validateDb.listCollections();
    // const collNames = colls.map(coll => coll.name);
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
    if (result == "y") {
      const dropResult = await validateDb.dropDatabase();
      logger.warn(`Wiped the database (${totalRecords} records in ${totalColls} collections).`);
      return dropResult;
    } else {
      return false;
    }
  } catch (e) {
    return e;
  }
}
