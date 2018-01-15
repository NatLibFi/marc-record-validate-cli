/*  global describe:true it:true */
import chai, { expect } from 'chai';
import nock from 'nock';
import fs from 'fs';
import Serializers from 'marc-record-serializers';
import chaiAsPromised from 'chai-as-promised';
import { show, validateRecord, fileFix, saveLocally, formatResults, outputFileName } from '../src/operations.js';
import chaiXml from 'chai-xml';

chai.use(chaiAsPromised);
chai.use(chaiXml);

const testRec = `
  <record>
    <leader>00000cca^a22000007i^4500</leader>
    <controlfield tag="001">009877349</controlfield>
    <controlfield tag="003">FI-MELINDA</controlfield>
    <controlfield tag="005">20171218125223.0</controlfield>
    <controlfield tag="007">qu</controlfield>
    <controlfield tag="008">170103s2016^^^^xxu||z|^^||||||||^|^zxx|c</controlfield>
    <datafield tag="035" ind1=" " ind2=" ">
      <subfield code="a">(FI-MELINDA)009877349</subfield>
    </datafield>
    <datafield tag="084" ind1=" " ind2=" ">
      <subfield code="a">78.852</subfield>
      <subfield code="2">ykl</subfield>
    </datafield>
    <datafield tag="100" ind1="1" ind2=" ">
      <subfield code="a">Smith, Sam,</subfield>
      <subfield code="e">säveltäjä.</subfield>
    </datafield>
    <datafield tag="245" ind1="1" ind2="0">
      <subfield code="a">Writing's on the wall.</subfield>
    </datafield>
    <datafield tag="336" ind1=" " ind2=" ">
      <subfield code="a">nuottikirjoitus</subfield>
      <subfield code="b">ntm</subfield>
      <subfield code="2">rdacontent</subfield>
    </datafield>
    <datafield tag="337" ind1=" " ind2=" ">
      <subfield code="a">käytettävissä ilman laitetta</subfield>
      <subfield code="b">n</subfield>
      <subfield code="2">rdamedia</subfield>
    </datafield>
    <datafield tag="700" ind1="1" ind2=" ">
      <subfield code="a">Napier, James,</subfield>
      <subfield code="e">säveltäjä.</subfield>
    </datafield>
    <datafield tag="740" ind1="0" ind2=" ">
      <subfield code="a">Spectre.</subfield>
    </datafield>
    <datafield tag="773" ind1="0" ind2=" ">
      <subfield code="7">nncm</subfield>
      <subfield code="w">(FI-MELINDA)009877249</subfield>
      <subfield code="t">101 movie hits. Trumpet. -</subfield>
      <subfield code="d">Milwaukee, WI : Hal Leonard, [2016]. -</subfield>
      <subfield code="m">1 soolonuotti (117 sivua). -</subfield>
      <subfield code="z">978-1-4950-6067-0,</subfield>
      <subfield code="o">HL00158091</subfield>
    </datafield>
  </record>`;

const api = nock(process.env.VALIDATE_API)
  .get('/bib/009877349')
  .reply(200, testRec)
  .persist();

describe('show', () => {
  it('Should throw an error because the id is invalid', async () => {
    expect(show('Kekkli kokkeli')).to.be.rejected;
  });
  it('Should be able to fetch a record', async () => {
    const res = await show('009877349');
    expect(res).to.be.a('string');
  });
});

describe('validateRecord', () => {
  it('Should be able to fetch a record', async () => {
    const res = await validateRecord('009877349');
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


describe('formatResults', () => {
  it('Should return a string with correct input', () => {
    const validationReport = JSON.parse(fs.readFileSync('./data/validationReport.json'));
    let formatted = formatResults(validationReport);
    expect(formatResults(validationReport)).to.be.a('string');
  });
});

describe('fileFix', async () => {
  it('Should throw because the file format is invalid', () => {
    expect(fileFix('./data/testrecord.edn')).to.be.rejected;
    expect(fileFix('./data/test_ids.txt')).to.be.rejected;
  });
  it('Should be able to fix local files in proper format', async () => {
    expect('kukka').to.not.equal('kukkax');
    let { outputFile, processedRecs } = await fileFix('./data/testdata.mrc');
    const validated1 = fs.readFileSync(`./files/${outputFile}`, 'utf-8');
    expect(validated1).xml.be.valid();
    let result = await fileFix('./data/testdata.seq');
    const validated2 = fs.readFileSync(`./files/${result.outputFile}`, 'utf-8');
    expect(validated2).xml.be.valid();
    result = await fileFix('./data/testdata.xml');
    const validated3 = fs.readFileSync(`./files/${result.outputFile}`, 'utf-8');
    expect(validated3).xml.be.valid();
  });
});

describe('saveLocally', async () => {
  it('Should be able to fetch and save a record', async () => {
    const record = Serializers.MARCXML.fromMARCXML(testRec);
    let res = await saveLocally(record);
    const id = record.get('001')[0].value;
    expect(res).to.include('Saved');
    expect(res).to.include(id);
  });
});

describe('outputFileName', () => {
  it('Should return a properly formatted filename', () => {
    const newFileName = outputFileName('123', '_testing');
    expect(newFileName).to.be.a('string');
    expect(newFileName).to.have.string('files/123_testing.xml');
  });
});
