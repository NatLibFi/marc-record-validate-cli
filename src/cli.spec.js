import chai, { expect } from 'chai';
// import Record from 'marc-record-js';
import chaiAsPromised from 'chai-as-promised';
import { fix, show, checkEnvVars, isWithinTimeinterval } from '../src/cli.js';

chai.use(chaiAsPromised);

describe('checkEnvVars', () => {
  it('Should return true because the credentials are set', () => {
    const result = checkEnvVars();
    expect(result).to.be.true;
  });
});
