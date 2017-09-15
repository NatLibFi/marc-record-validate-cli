import chai, {expect} from 'chai';
import Record from 'marc-record-js';
import { fix } from '../build/cli.js';

describe('fix', () => {
  it('Should be able to fetch a record', done => {
    fix('123')
      .then(rec => {
        expect(rec).to.be.an.instanceof(Object);
      }).done();
  });
});
