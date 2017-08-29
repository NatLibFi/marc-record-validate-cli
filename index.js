const axios = require('axios');
const fs = require('fs');
const Serializers = require('marc-record-serializers');

/**
 * A scaffold for parsing the command-line arguments.
 */
const argv = require('yargs')
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

function readConfig (filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf-8', (err, data) => {
      if (err) { reject(err); }
      const config = JSON.parse(data).melinda;
      resolve(`${config.host}${config.path}`);
    });
  });
}

/**
 * This function fetches a single record from the API and returns the
 * serialized result.
 * @param {string} url - The parsed API endpoint
 * @param {string} recid - The ID of the record to fetch
 * @returns {object} - The marc-record-js object
 */
function fetchRecord (url, recid) {
  return axios.get(`${url}${recid}`)
    .then(response => Serializers.MARCXML.fromMARCXML(response.data))
    .catch(err => err);
}

/**
 * Removable dummy code for testing.
 */
readConfig('config.json')
  .then(data => fetchRecord(data, '007320849'))
  .catch(err => console.log(err))
  .then(result => {
    console.log(result.toString());
  });
