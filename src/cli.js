import 'babel-polyfill';
import * as fs from 'fs';
import Record from 'marc-record-js';
import * as _ from 'lodash';
import { MongoClient } from 'mongodb';
import * as yargs from 'yargs';
import { validate, client, mongoUrl } from './config';

/**
 * Parse the command-line arguments.
 */
const argv = yargs
  .usage('Usage: $0 <command> [options]')
  .help('h')
  .alias('h', 'help')
  .alias('v', 'validate')
  .describe('v', 'Validate a single record')
  .alias('l', 'localfix')
  .describe('l', 'Fix a single record, save the result locally')
  .alias('f', 'fix')
  .describe('f', 'Fix a single record')
  .alias('x', 'fixfile')
  .describe('x', 'Read record ids from file, fix all')
  .argv;

function isValid(id) {
  return Number(id) > 0 && Number(id) < 100000000;
}

/**
 * Fetch and validate a record
 * @param {string} - Record id
 * @returns {Promise} - Resolves with the validated record.
 */
export async function fix(id) {
  if (!isValid(id)) {
    throw new Error(`Invalid record id: ${id}`);
  }
  try {
    let record = await client.loadRecord(id);
    if (!record) {
      return null;
    }
    const originalRec = Record.clone(record);
    let results = await validate(record);
    // If the record has been mutated, revalidate it
    if (!Record.isEqual(originalRec, record)) {
      results = await validate(record);
    }
    return record;
  } catch(e) {
    return Promise.reject(e);
  }
}

export async function save(record) {
  const response = await client.updateRecord(record);
  return response;
}

export async function validateAndFix(id) {
  if (!isValid(id)) {
    throw new Error(`Invalid record id: ${id}`);
  }
  console.log(`Fetching record ${id}...`);
  const record = await client.loadRecord(id);
  if (record) {
    const originalRec = Record.clone(record);
    console.log(`Validating record ${id}`);
    const results = await validate(record);
    if (results.failed) {
      Promise.reject('Validation failed.');
    }
    console.log(results)
  }
  const response = await save(record);
  // TODO: Log response messages in a sane way.
  // TODO: Log undo information in db.
  console.log(response)
  return response;
}

export async function validateAndFixMultiple(idlist, chunkSize) {
  const [head, ...tail] = _.chunk(idlist, chunkSize);
  if (head) {
    Promise.all(head.map(validateAndFix)).then(results => {
      console.log(results);
      validateAndFixMultiple(tail, chunkSize);
    });
  }
  console.log("Done.");
}

/**
 * Process command-line arguments.
 */
if (argv.f) {
  validateAndFix(argv.f);
} else if (argv.x) {
  const ids = fs.readFileSync(argv.x, 'utf-8').split('\n').filter(x => x.length);
  validateAndFixMultiple(ids, argv.s || 10);
}
