import 'babel-polyfill';
import fs from 'fs';
import Record from 'marc-record-js';
import Serializers from 'marc-record-serializers';
import * as yargs from 'yargs';
import MelindaClient from '@natlibfi/melinda-api-client';
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


/**
 * Fetch and validate a record
 * @param {string} - Record id
 * @returns {Promise} - Resolves with the validated record.
 */
export async function fix(id) {
  console.log('Fetching record...');
  let record = await client.loadRecord(id);
  if (!record) {
    return new Promise((_, reject) => {
      reject('Not found');
    });
  }
  const originalRec = Record.clone(record);
  const results = await validate(record);
  // If the record has been mutated, revalidate it
  if (!Record.isEqual(originalRec, record)) {
    console.log('Revalidating after changes...');
    record = await validate(record);
  } else {
    console.log("Nothing to change...");
  }
  return record;
}

Promise.all(['123', '124', '125'].map(fix)).then(res => console.log("Done!"));
