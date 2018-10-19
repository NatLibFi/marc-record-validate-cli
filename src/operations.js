/*
* This module contains the functions that perform the operational logic. These
* functions should be as pure as possible - no output printing.
*/
import {MarcRecord} from '@natlibfi/marc-record';
import {AlephSequential, ISO2709, MARCXML} from '@natlibfi/marc-record-serializers';
import path from 'path';
import fs from 'fs';

export default (validate, client) => {
	return {
		isValid,
		dataFieldStringFormatter,
		fieldToString,
		formatResults,
		validateRecord,
		fix,
		outputFileName,
		generateBatchId,
		show,
		fileFix,
		sleep,
		isWithinTimeinterval,
		saveLocally
	};

	/**
	* Check whether a record id is valid.
	* @param {id} - string
	* @returns {boolean}
	*/
	function isValid(id) {
		return Number(id) > 0 && Number(id) < 100000000;
	}

	function dataFieldStringFormatter(dataFieldArray) {
		const subfieldMarker = '‡';
		let indicatorsString = '';
		indicatorsString += dataFieldArray[1];
		indicatorsString += dataFieldArray[2];

		return dataFieldArray[0] + ' ' + indicatorsString + ' ' + subfieldMarker + dataFieldArray[3].join(subfieldMarker);
	}

	function fieldToString(field) {
		let subfieldDataArray = field.subfields.map(subfield => {
			return subfield.code + subfield.value;
		});

		let fieldArray = [];

		fieldArray.push([field.tag, field.ind1, field.ind2, subfieldDataArray]);
		return fieldArray.map(dataFieldStringFormatter).join('\n');
	}

	/**
	* Format validator reports into string format.
	* @param {object} - results
	* @returns {string}
	*/
	function formatResults(results) {
		return results.report.reduce((acc, item) => {
			return `${acc}
=======================
${item.description}: ${item.state}`;
		}, 'Validator reports:');
	}

	/**
	* Fetch and validate a record
	* @param {string} - Record id
	* @returns {Promise} - Resolves with an object containing validation reports, original and validated records
	*/
	async function validateRecord(id) {
		if (!isValid(id)) {
			throw new Error(`Invalid record id: ${id}`);
		}

		try {
			let record = await client.loadRecord(id);
			const originalRec = MarcRecord.clone(record);
			let results = await validate(record);

			return {
				id: originalRec.get('001')[0].value,
				originalRecord: originalRec,
				results: results,
				validatedRecord: record
			};
		} catch (e) {
			return Promise.reject(e);
		}
	}

	/**
	* Fix a single record in the database.
	* @param {id} - string
	* @returns {Promise} - Resolves with an object containing validation reports,
	* original and validated records and the response from the API when the record
	* was updated.
	*/
	async function fix(id) {
		const validationRes = await validateRecord(id);
		const {originalRecord, validatedRecord} = validationRes;

		if (originalRecord.toString() !== validatedRecord.toString()) {
			const response = await client.updateRecord(validatedRecord, {bypass_low_validation: true}); // eslint-disable-line camelcase
			validationRes.updateResponse = response;
		}

		return validationRes;
	}

	/**
	* Parse a name for an outputfile.
	* @param {string} - id
	* @param {string} - ending
	* @returns {string}
	*/
	function outputFileName(id, ending = '') {
		return path.resolve(`files/${id}${ending}.xml`);
	}

	async function show(id) {
		if (!isValid(id)) {
			throw new Error(`Invalid record id: ${id}`);
		}
		try {
			let record = await client.loadRecord(id);
			return record.toString();
		} catch (e) {
			return `Processing record ${id} failed: ${e}`;
		}
	}

	/*
	* Read records from a local file, validate them, fix and write to new file.
	* @param { string } file - Input file where the records are read.
	* @returns Promise - Resolves with the name of the output file.
	*/
	async function fileFix(file) { // eslint-disable-line require-await
		return new Promise((resolve, reject) => {
			const outputDir = './files';
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir);
			}
			const suffix = file.slice(-3).toLowerCase();
			let fromFileStream = fs.createReadStream(file);
			fromFileStream.setEncoding('utf8');
			const outputFile = `${outputDir}/${file.split('/').pop().slice(0, -4)}_validated.xml`;
			let reader;
			if (suffix === 'xml') {
				reader = new MARCXML.Reader(fromFileStream);
			} else if (suffix === 'mrc' || file.slice(-4).toLowerCase() === 'marc') {
				reader = new ISO2709.Reader(fromFileStream);
			} else if (suffix === 'seq') {
				reader = new AlephSequential.Reader(fromFileStream);
			} else {
				reject(new Error('Unrecognized filetype.'));
			}
			const declaration = '<?xml version="1.0" encoding="UTF-8"?><collection xmlns="http://www.loc.gov/MARC21/slim">';
			fs.appendFileSync(outputFile, declaration);
			let processedRecs = 0;
			reader.on('data', async rec => {
				await validate(rec);
				const validatedRecordAsXML = MARCXML.to(rec);
				processedRecs++;
				fs.appendFileSync(outputFile, validatedRecordAsXML);
			}).on('end', () => {
				fs.appendFileSync(outputFile, '</collection>');
				const response = {
					outputFile: outputFile.split('/').pop(),
					processedRecs: processedRecs
				};
				resolve(response);
			});
		});
	}

	/**
	* Generate a unique id for the batch job from js Date object.
	* @param {Date} - A date object (optional)
	* @return {string}
	*/
	function generateBatchId(date = new Date()) {
		return `batch${date.getTime()}`;
	}

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	* Check whether the current moment is within the 'timeinterval' range for fixmultiple
	* @param {string} - range
	* @param {Date} - date
	* @returns {boolean}
	*/
	function isWithinTimeinterval(range, date = new Date()) {
		if (!range || [0, 6].includes(date.getDay())) { // The timerange isn't adhered to on weekends.
			return true;
		}

		if (range.length !== 5) {
			throw new Error('Timerange should be in format "11-02"');
		}

		const [start, end] = range.split('-').map(n => Number(n));

		if (isNaN(start) || isNaN(end) || start < 0 || start > 23 || end < 0 || end > 23) {
			throw new Error(`Invalid time interval: ${range}, it should be in format like: '18-06'.`);
		}

		const curr = date.getHours();
		return start < end ? (curr >= start && curr < end) : (curr >= start || curr < end);
	}

	function saveLocally(record, ending = '') {
		const id = record.get('001')[0].value;
		const fileName = outputFileName(id, ending);
		const validatedRecordAsXML = MARCXML.to(record);

		if (!fs.existsSync('./files')) {
			fs.mkdirSync('./files');
		}

		fs.writeFileSync(fileName, validatedRecordAsXML);
		return `Saved ${fileName}`;
	}
};
