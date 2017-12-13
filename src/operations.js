/*
 * This module contains the functions that perform the operational logic. These
 * functions should be as pure as possible - no output printing.
 */
import 'babel-polyfill';
import Record from 'marc-record-js';
// import Serializers from 'marc-record-serializers';
// import * as _ from 'lodash';
import { validate, client } from './config';

function isValid(id) {
  return Number(id) > 0 && Number(id) < 100000000;
}

/**
 * Fetch and validate a record
 * @param {string} - Record id
 * @returns {Promise} - Resolves with an object containing validation reports, original and validated records
 */
export async function validateRecord(id) {
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
    let revalidationResults = '';
    // If the record has been mutated, revalidate it
    if (!Record.isEqual(originalRec, record)) {
      revalidationResults = await validate(record);
    }
    return {
      originalRecord: originalRec,
      results: results,
      revalidationResults: revalidationResults,
      validatedRecord: record
    };
  } catch(e) {
    return Promise.reject(e);
  }
}

function getTimeStamp() {
  const date = new Date();
  // will display time in 21:00:00 format
  return `${date.getFullYear()}-${1+date.getMonth()}-${date.getDate()}_${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

export async function show(id) {
  if (!isValid(id)) {
    throw new Error(`Invalid record id: ${id}`);
  }
  // console.log(`Fetching record ${id}`);
  try {
    let record = await client.loadRecord(id);
    // console.log(record)
    return record.toString();
  } catch (e) {
    // console.log(`Processing record ${id} failed.`);
    return `Processing record ${id} failed: ${e}`;
  }
}
