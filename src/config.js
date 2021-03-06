import validatorFactory from 'marc-record-validate';
import MelindaClient from '@natlibfi/melinda-api-client';

/**
 * Define active validators below.
 */
const validate = validatorFactory([
  /**
   * validator name: decomposer
   * action: perform character normalizations
   * options: none
   */
  require('@natlibfi/marc-record-validators-melinda/lib/validators/decomposer'),
  /**
   * validator name: function-terms
   * action: Fix function terms in 100$e/700$e subfields that were messed up
   * in the RDA-conversion
   * options: none
   */
  require('@natlibfi/marc-record-validators-melinda/lib/validators/function-terms'),
  /**
   * validator name: identical-field-eliminator
   * action: Deduplicate identical fields in a record.
   * options: none
   */
  require('@natlibfi/marc-record-validators-melinda/lib/validators/identical-field-eliminator'),
  require('@natlibfi/marc-record-validators-melinda/lib/validators/udk-version-fenni'),
  require('@natlibfi/marc-record-validators-melinda/lib/validators/sort-tag')
])({
  failOnError: false,
  fix: true
});

/**
 * Initialize melinda-api-client, read credentials from environment variables
 */
const client = new MelindaClient({
  endpoint: process.env.VALIDATE_API || 'http://libtest.csc.fi:8992/API/latest',
  user: process.env.VALIDATE_USER,
  password: process.env.VALIDATE_PASS
});

export { validate, client };
