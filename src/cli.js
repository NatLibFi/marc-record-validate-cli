import 'babel-polyfill';
import * as fs from 'fs';
import Record from 'marc-record-js';
import Serializers from 'marc-record-serializers';
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

/**
 * Fetch and validate a record
 * @param {string} id - Record id
 * @returns {object} - Returns an object containing the id,
 * the unmodified original record (in MARCXML),
 * the response from validators,
 * the fixed record and
 * a response from the API when (if) the record was changed.
 */
export async function validateAndFix(id) {
  if (!isValid(id)) {
    throw new Error(`Invalid record id: ${id}`);
  }
  console.log(`Fetching record ${id}`);
  try {
    let record = await client.loadRecord(id);
    const originalRec = Record.clone(record);
    const report = await validate(record);
    let apiResponse = null;
    if (!record.equalsTo(originalRec)) {
      // If the record has been mutated, revalidate it
      record = await validate(record);
      apiResponse = await client.updateRecord(record);
      console.log(apiResponse)
    }
    return {
      id: id,
      originalRec: Serializers.MARCXML.toMARCXML(Record.clone(record)),
      report: report,
      validatedRec: Serializers.MARCXML.toMARCXML(record),
      apiResponse: apiResponse
    }
  } catch (e) {
    console.log(`Processing record ${id} failed.`);
    return `Processing record ${id} failed: ${e}`;
  }
}

function getTimeStamp() {
  const date = new Date();
  // will display time in 21:00:00 format
  return `${date.getFullYear()}-${1+date.getMonth()}-${date.getDate()}_${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

function logToDb(data, cb) {
  MongoClient.connect(mongoUrl, (err, db) => {
    if (err) throw err;
    db.collection("test").insert(data, (err, doc) => {
      if (err) throw err;
      db.close();
      cb(doc);
    });
  });
}

export function validateAndFixMultiple(idlist, chunkSize, acc = {"errs": [], "recs": [], "total": idlist.length}) {
  console.log(getTimeStamp())
  const [head, ...tail] = _.chunk(idlist, chunkSize);
  let processedCount = acc.errs.length + acc.recs.length;
  console.log(`Processing records no ${1+processedCount}-${processedCount+head.length}/${acc.total}...`);
  if (head) {
    Promise.all(head.map(validateAndFix))
      .then(results => {
        let errors = _.filter(results, (i) => _.isString(i));
        let res = _.filter(results, (i) => !_.isString(i));
        acc.errs = _.concat(acc.errs, errors);
        acc.recs = _.concat(acc.recs, res);
        if (tail.length > 0) {
          validateAndFixMultiple([].concat.apply([], tail), chunkSize, acc);
        } else {
          console.log("Nyt muistiin.")
          logToDb(acc, (doc) => {
            console.log(doc);
            console.log("Done!");
            console.log(`Amount of recs processed: ${acc.errs.length+acc.recs.length}`);
          });
        }
      })
      .catch(err => console.log("In the err block, " + err));
  }
}

/**
 * Process command-line arguments.
 */
if (argv.f) {
  validateAndFix(argv.f)
    .then(resp => console.log(resp))
    .catch(err => console.log("Kutsutaan: " + err))
} else if (argv.x) {
  const ids = fs.readFileSync(argv.x, 'utf-8').split('\n').filter(x => x.length);
  validateAndFixMultiple(ids, argv.s || 10);
}
