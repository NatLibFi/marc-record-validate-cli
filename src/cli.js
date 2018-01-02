import 'babel-polyfill';
import * as yargs from 'yargs';
import * as _ from 'lodash';
import * as winston from 'winston';
import fs from 'fs';
import { show, validateRecord, fix, fileFix, saveLocally, isValid } from './operations.js';

/**
 * Initialize logging
 */
const logger = new winston.Logger({
  level: 'info',
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: 'logfile.log' })
  ]
});

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
  .alias('c', 'chunksize')
  .describe('c', 'The chunksize for processing ids')
  .alias('s', 'show')
  .describe('s', 'Show a single record')
  .argv;


function afterSuccessfulUpdate(res) {
  const { originalRecord, updateResponse, validatedRecord, results } = res;
  const message = _.map(updateResponse.messages, 'message').join('\n');
  const id = originalRecord.get('001')[0].value;
  console.log(`${message}
  ==============
  Record ${id} after validation:

  ${validatedRecord.toString()}

  ${JSON.stringify(results)}
  `);
  saveLocally(originalRecord, '_original').then(res => console.log(res));
  saveLocally(validatedRecord, '_validated').then(res => console.log(res));
}

/**
 * Process command-line arguments.
 */
if (argv.s) {
  // Show a single record.
  logger.log('info', 'jeah!') // TEST
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
    .then(res => afterSuccessfulUpdate(res))
    .catch(err => {
      console.log(err);
      const errs = _.map(err.errors, 'message').join('\n');
      console.log(`Updating record ${id} failed: '${errs}'`);
    });
} else if (argv.x) {
  const file = argv.x;
  fileFix(file)
    .then(res => console.log(`Done. ${res}`))
    .catch(err => console.log(err));
} else if (argv.m) {
  // Read multiple record ids from file, validate and fix.
  const file = argv.m;
  if (!fs.existsSync(file)) {
    throw new Error(`File ${file} does not exist.`);
  }
  const ids = fs.readFileSync(file, 'utf8')
    .split('\n')
    .map(id => id.trim())
    .filter(id => isValid(id));

  if (ids.length < 1) {
    throw new Error('File does not contain valid record ids.');
  }

  const chunk = argv.c || 10;

  let idSets = _.chunk(ids, chunk);

  async function fixAll(idChunks) {
    const [head, ...tail] = idChunks;
    if (!head) {
      console.log("Done.");
      return true;
    }

    const results = await Promise.all(head.map(async (id) => {
      try {
        let res = await fix(id);
        afterSuccessfulUpdate(res);
      } catch (err) {
        const errs = _.map(err.errors, 'message').join('\n');
        console.log(`Updating record ${id} failed: '${err}'`);
      }
    }));
    fixAll(tail);
  }

  fixAll(idSets);
}

