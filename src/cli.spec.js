import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { checkEnvVars } from '../src/cli.js';

chai.use(chaiAsPromised);

describe('checkEnvVars', () => {
  it('Should return true because the credentials are set', () => {
    const result = checkEnvVars();
    expect(result).to.be.true;
  });
});
