import * as yargs from 'yargs';
import * as _ from 'lodash';
import { show, validateRecord, fix, fileFix, saveLocally } from './operations.js';

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
} else if (argv.v || argv.l) {
  // Validate a single record without updating the db.
  const id = argv.v ? argv.v : argv.l;
  console.log(`Validating record ${id}`);
  validateRecord(id).then(res => {
    console.log(res.results);
    if (res.revalidationResults !== '') {
      console.log('The record was revalidated after changes, the validator output was:');
      console.log(res.revalidationResults);
    }
    console.log('Validated record:');
    console.log(res.validatedRecord.toString());
    if (argv.l) {
      saveLocally(res.validatedRecord);
    }
  }).catch(err => {
    console.log(err);
  });
} else if (argv.f) {
  const id = argv.f;
  fix(id)
    .then(res => {
      const { originalRecord, updateResponse, validatedRecord, results } = res;
      const message = _.map(updateResponse.messages, 'message').join('\n');
      console.log(`${message}
      ==============
      Record ${id} after validation:

      ${validatedRecord.toString()}

      ${JSON.stringify(results)}
      `);
      saveLocally(originalRecord, '_original').then(res => console.log(res));
      saveLocally(validatedRecord, '_validated').then(res => console.log(res));
    })
    .catch(err => {
      const errs = _.map(err.errors, 'message').join('\n');
      console.log(`Updating record ${id} failed: '${errs}'`);
    });
} else if (argv.x) {
  const file = argv.x;
  fileFix(file).then(res => console.log(`Done. ${res}`))
    .catch(err => console.log(err));
} else if (argv.m) {
  console.log('TODO');
}
