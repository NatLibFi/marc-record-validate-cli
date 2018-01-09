import 'babel-polyfill';
import * as yargs from 'yargs';
import * as _ from 'lodash';
import * as winston from 'winston';
import fs from 'fs';
import { show, validateRecord, fix, fileFix, saveLocally, isValid, formatResults } from './operations.js';

/**
 * Initialize logging
 */
const logger = new winston.Logger({
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

  ${formatResults(results)}
  `);
  saveLocally(originalRecord, '_original').then(res => console.log(res));
  if (results !== "") {
    /**
     * If the API results from the update operation is an empty string, the record
     * has not been updated.
     */
    saveLocally(validatedRecord, '_validated').then(res => console.log(res));
  }
}

/**
 * Process command-line arguments.
 */
if (argv.x) {
  const file = argv.x;
  console.log(`Validating records from file ${file}.`);
  fileFix(file)
    .then(res => {
      logger.info(res);
    })
    .catch(err => {
      logger.log('error', err);
    });
}

/*
 * Check whether the enviroment variables necessary for the operation are set.
 * @param {boolean} - creds
 * @returns {boolean}
 */
export function checkEnvVars(creds = 'false') {

  if (!process.env.VALIDATE_API) {
    throw new Error('The environment variable VALIDATE_API is not set.');
  }

  if (creds && !process.env.VALIDATE_USER || !process.env.VALIDATE_PASS) {
    throw new Error('Environment variable(s) VALIDATE_USER and/or VALIDATE_PASS are not set.');
  }
  return true;
}

if (argv.s) {
  // Show a single record.
  checkEnvVars();
  show(argv.s)
    .then(rec => console.log(rec))
    .catch(err => {
      logging.log({
        level: 'error',
        message: err
      });
    });
}

if (argv.v || argv.l) {
  checkEnvVars(true);
  // Validate a single record without updating the db.
  const id = argv.v ? argv.v : argv.l;
  console.log(`Validating record ${id}`);
  validateRecord(id).then(res => {
    console.log(formatResults(res.results));
    if (res.revalidationResults !== '') {
      console.log('The record was revalidated after changes, the validator output was:');
      console.log(formatResults(res.revalidationResults));
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
  checkEnvVars(true);
  const id = argv.f;
  fix(id)
    .then(res => afterSuccessfulUpdate(res))
    .catch(err => {
      // const errs = _.map(err.errors, 'message').join('\n');
      console.log(`Updating record ${id} failed: '${err}'`);
      logger.log('error', errs);
    });
} else if (argv.m) {
  checkEnvVars(true);
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

  const chunk = argv.c || 5;

  let idSets = _.chunk(ids, chunk);

  fixAll(idSets, ids.length);
}

/**
 * Fix a batch of records. Calls itself recursively until all chunks are processed.
 * @param {array} - idChunks - A list of lists of ids. E.g. [[1, 2, 3], [4, 5, 6]].
 * @param {number} - total - The total number of records to process.
 * @returns {Promise} - Resolves with true when everything is processed. Logs errors in the process.
 */
async function fixAll(idChunks, total) {

  const [head, ...tail] = idChunks;
  const left = head.length * tail.length;
  const done = total - left;

  if (!head) {
    console.log('Done.');
    return true;
  }

  const results = await Promise.all(head.map(async (id) => {
    try {
      let res = await fix(id);
      res.results['id'] = id;
      logger.log('info', res.results);
      afterSuccessfulUpdate(res);
    } catch (err) {
      const errorMessage = `Updating record ${id} failed: '${err}'`;
      console.log(errorMessage);
      logger.log({
        level: 'error',
        message: errorMessage
      });
    }
  }));

  console.log(`${done}/${total} (${Math.round(done / total * 100)} %) records processed.`);
  fixAll(tail, total);
}
