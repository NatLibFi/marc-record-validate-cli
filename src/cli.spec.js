import chai, { expect } from 'chai';
import Record from 'marc-record-js';
import chaiAsPromised from 'chai-as-promised';
import { fix } from '../build/cli.js';

chai.use(chaiAsPromised);

describe('fix', () => {
  it('Should be able to fetch a record', async () => {
    const res = await fix('124');
    expect(res).to.be.an.instanceof(Object);
  });

  it('Should throw because the record id is invalid', () => {
    expect(fix('123ABC')).to.be.rejected;
    expect(fix('MOIKKA!')).to.be.rejected;
  });
});
