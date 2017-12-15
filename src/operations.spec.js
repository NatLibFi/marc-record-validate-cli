/*  global describe:true it:true */
import chai, { expect } from 'chai';
// import Record from 'marc-record-js';
import chaiAsPromised from 'chai-as-promised';
import { show, validateRecord, fileFix } from '../src/operations.js';

chai.use(chaiAsPromised);

describe('show', () => {
  it('Should be able to fetch a record', async () => {
    const res = await show('123');
    expect(res).to.be.a('string');
  });
});

describe('validateRecord', () => {
  it('Should be able to fetch a record', async () => {
    const res = await validateRecord('123');
    expect(res).to.be.an.instanceOf(Object);
    expect(res).to.have.property('originalRecord');
    expect(res).to.have.property('validatedRecord');
    expect(res).to.have.property('results');
    expect(res).to.have.property('revalidationResults');
  });

  it('Should throw because the id is invalid', async () => {
    expect(validateRecord('MOIKKA!')).to.be.rejected;
    expect(validateRecord('123!')).to.be.rejected;
    expect(validateRecord('1 23')).to.be.rejected;
    expect(validateRecord('123019824981274981274')).to.be.rejected;
  });
});

describe('fileFix', () => {
  it('Should throw because the file format is invalid', () => {
    expect(fileFix('./data/testrecord.end')).to.be.rejected;
  });
});
