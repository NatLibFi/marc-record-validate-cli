import 'babel-polyfill';
import Record from 'marc-record-js';
import * as yargs from 'yargs';
import MelindaClient from '@natlibfi/melinda-api-client';
import * as _ from 'lodash';

if (!process.env.VALIDATE_USER || !process.env.VALIDATE_PASS) {
  throw new Error('Environment variable(s) VALIDATE_USER and/or VALIDATE_PASS not set');
}

const client = new MelindaClient({
  endpoint: process.env.VALIDATE_API || 'http://melinda.kansalliskirjasto.fi/API/latest/',
  user: process.env.VALIDATE_USER,
  password: process.env.VALIDATE_PASS
});

import validateFactory from '@natlibfi/marc-record-validators-melinda';

const validate = validateFactory({
  fix: true
});

/**
 * A scaffold for parsing the command-line arguments.
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

function parseValidatorReport(report) {
  return typeof(report);
}

/**
 * Fetch and validate a record
 * @param {string} - Record object
 * @returns {Promise} - Resolves with the validated record.
 */
export async function fixRecord(record) {
  const originalRec = Record.clone(record);
  let results = await validate(record);
  // If the record has been mutated, revalidate it
  if (!Record.isEqual(originalRec, record)) {
    let newResults = await validate(record);
  }
  return results;
}

export async function getRecord(id) {
  if (!isValid(id)) {
    throw new Error(`Invalid record id: ${id}`);
  }
  try {
    return await client.loadRecord(id);
  }
  catch (err) {
    throw new Error(`No record with id ${id}`);
  }
}

/**
 * Check args and call the needed functions here.
 * All console printing should be done here.
 */

/* Fix a single record (--fix / -f flags) */
if (argv.fix) {
  let record = "";
  getRecord(argv.fix).then(data => {
    record = data;
  })
  .catch(err => console.log(err));
}
