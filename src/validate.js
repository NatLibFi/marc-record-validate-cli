/* eslint-disable new-cap */

import {MarcRecord} from '@natlibfi/marc-record';
import validateFactory from '@natlibfi/marc-record-validate';
import {IdenticalFields} from '@natlibfi/marc-record-validators-melinda';

export default async () => {
	MarcRecord.setValidationOptions({subfieldValues: false});

	const validate = await validateFactory([await IdenticalFields()]);
	const validateOptions = {
		failOnError: true,
		fix: true,
		validateFixes: true
	};

	return async record => { // eslint-disable-line require-await
		return validate(record, validateOptions);
	};
};
