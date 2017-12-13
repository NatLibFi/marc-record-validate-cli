// import chai, { expect } from 'chai';
// import Record from 'marc-record-js';
// import chaiAsPromised from 'chai-as-promised';
// import { fix, show } from '../build/cli.js';

// chai.use(chaiAsPromised);

// describe('fix', () => {
//   it('Should be able to fetch a record', async () => {
//     const res = await fix('124');
//     expect(res).to.be.an.instanceof(Object);
//   });

//   it('Should throw because the record id is invalid', () => {
//     expect(fix('123ABC')).to.be.rejected;
//     expect(fix('MOIKKA!')).to.be.rejected;
//   });
// });

// describe('show', () => {
//   it('Should return a string representation of a record', async () => {
//     const record = await show('123');
//     expect(record).to.be.a('string');
//   });

//   it('Should throw because the record id is invalid', () => {
//     expect(fix('Bama lama')).to.be.rejected;
//     expect(fix('123Kd')).to.be.rejected;
//   });
// });
