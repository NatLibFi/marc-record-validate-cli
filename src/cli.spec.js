import chai, { expect } from 'chai';
import Record from 'marc-record-js';
import chaiAsPromised from 'chai-as-promised';
import { fix, show, checkEnvVars, isWithinTimeinterval } from '../src/cli.js';

chai.use(chaiAsPromised);

describe('checkEnvVars', () => {
  it('Should return true because the credentials are set', () => {
    expect(checkEnvVars()).to.be.true;
  });
});

describe('isWithinTimeinterval', () => {
  it('Should throw an error because the time range is not defined', () => {
    expect(() => isWithinTimeinterval(new Date(2018, 1, 1, 4, 0, 0))).to.throw(Error, /^Timerange should be in/);
  });
  it('Should throw an error because the time range invalid', () => {
    expect(() => isWithinTimeinterval('99-14', new Date(2018, 1, 1, 4, 0, 0))).to.throw(Error, /^Invalid time interval/);
  });
  it('Should return true when the date is within the interval', () => {
    expect(isWithinTimeinterval('19-06', new Date(2018, 1, 1, 4, 0, 0))).to.be.true;
    expect(isWithinTimeinterval('01-23', new Date(2018, 1, 1, 1, 0, 0))).to.be.true;
    expect(isWithinTimeinterval('23-00', new Date(2018, 1, 1, 23, 0, 0))).to.be.true;
  });
  it('Should return false when the date is not within the interval', () => {
    expect(isWithinTimeinterval('23-00', new Date(2018, 1, 1, 0, 0, 0))).to.be.false;
    expect(isWithinTimeinterval('19-06', new Date(2018, 1, 1, 6, 0, 0))).to.be.false;
    expect(isWithinTimeinterval('19-06', new Date(2018, 1, 1, 10, 0, 0))).to.be.false;
    expect(isWithinTimeinterval('04-06', new Date(2018, 1, 1, 10, 0, 0))).to.be.false;
    expect(isWithinTimeinterval('01-23', new Date(2018, 1, 1, 0, 0, 0))).to.be.false;
  });

  it('Should return true when the date is on weekend', () => {
    expect(isWithinTimeinterval('11-12', new Date(2018, 1, 3, 1, 0, 0))).to.be.true;
    expect(isWithinTimeinterval('11-12', new Date(2018, 1, 4, 1, 0, 0))).to.be.true;
    expect(isWithinTimeinterval('11-12', new Date(2018, 1, 5, 1, 0, 0))).to.be.false;
  });

});
