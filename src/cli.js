import * as yargs from 'yargs';
import { show, validateRecord } from './operations.js';

/**
 * Parse the command-line arguments.
 */
const argv = yargs
  .usage('Usage: node ./build/cli.js <options>')
  .help('h')
  .alias('h', 'help')
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
  .alias('s', 'show')
  .describe('s', 'Show a single record')
  .argv;

/**
 * Process command-line arguments.
 */
if (argv.s) {
  // Show a single record.
  show(argv.s).then(rec => console.log(rec));
} else if (argv.v) {
  const id = argv.v;
  console.log(`Validating record ${id}`);
  validateRecord(id).then(res => {
    console.log(res.results);
    if (res.revalidationResults !== '') {
      console.log('The record was revalidated after changes, the validator output was:');
      console.log(res.revalidationResults);
    }
    console.log('Validated record:');
    console.log(res.validatedRecord.toString());
  }).catch(err => {
    console.log(err);
  });
}
