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
export async function fix(record, validate) {
  const originalRec = Record.clone(record);
  let results = await validate(record);
  // If the record has been mutated, revalidate it
  if (!Record.isEqual(originalRec, record)) {
    let newResults = await validate(record);
  }
  return results;
}

/**
 * Check args and call the needed functions here.
 * All console printing should be done here.
 */

/* Fix a single record (--fix / -f flags) */

export async function validateAndFix(id) {
  console.log(`Fixing single record ${id}.`);
  if (!isValid(id)) {
    throw new Error(`Invalid record id: ${id}`);
  }
  let record = await client.loadRecord(id);
  if (!record) {
    console.log(`Record ${id} not found.`);
    return;
  }
  console.log("Found record: ");
  console.log(record.toString());
  const originalRec = Record.clone(record);
  const results = await fix(record, validate);
  console.log(`Validated record:\n${record.toString()}`);
  console.log(JSON.stringify(results));
  const apiResponse = await client.updateRecord(record);
  const message = apiResponse.messages[0].message;
  console.log(message);
}

if (argv.fix) {
  validateAndFix(argv.fix);
}
