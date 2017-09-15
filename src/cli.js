import 'babel-polyfill';
import Record from 'marc-record-js';
import * as yargs from 'yargs';
import MelindaClient from '@natlibfi/melinda-api-client';

if (!process.env.USER || !process.env.PASS) {
  throw new Error('Environment variable(s) USER and/or PASS not set');
}

const client = new MelindaClient({
  endpoint: 'http://melinda.kansalliskirjasto.fi/API/latest/',
  user: '',
  password: ''
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
      //console.log('Revalidating after changes...');
      results = await validate(record);
    }
    return record;
  } catch(e) {
    return null;
  }
}
