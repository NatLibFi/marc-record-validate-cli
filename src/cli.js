import 'babel-polyfill';
import fs from 'fs';
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
 * Removable dummy code for testing.
 */
async function test2() {
  console.log('Fetching record...');
  const record = await client.loadRecord('007320849');
  console.log(record.toString());
  console.log('Got it!');
}

test2();
