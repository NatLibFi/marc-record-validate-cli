/*  global describe:true it:true */
/* eslint-disable no-unused-expressions, require-await */

import chai, {expect} from 'chai';
import fs from 'fs';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import chaiAsPromised from 'chai-as-promised';
import chaiXml from 'chai-xml';
import createOperations from './operations';

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

const testRecObj = MARCXML.from(testRec);

/* Const api = nock(process.env.MELINDA_API)
	.get('/bib/009877349')
	.reply(200, testRec)
	.persist(); */

describe('factory', () => {
	const {
		show,
		validateRecord,
		fileFix,
		saveLocally,
		formatResults,
		generateBatchId,
		isWithinTimeinterval,
		outputFileName
	} = createOperations(() => {}, {
		loadRecord: async () => {
			return Promise.resolve(testRecObj);
		}
	});

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
			expect(formatted).to.be.a('string');
		});
	});

	describe('fileFix', async () => {
		it('Should throw because the file format is invalid', () => {
			expect(fileFix('./data/testrecord.edn')).to.be.rejected;
			expect(fileFix('./data/test_ids.txt')).to.be.rejected;
		});
		it('Should be able to fix local files in proper format', async () => {
			expect('kukka').to.not.equal('kukkax');
			let {outputFile} = await fileFix('./data/testdata.mrc');
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
			const record = MARCXML.from(testRec);
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

	describe('generateBatchId', () => {
		it('Should generate a sane batch id', () => {
			const id = generateBatchId();
			const id2 = generateBatchId(new Date('2000-01-01'));
			const id3 = generateBatchId(new Date('2000-01-01'));
			const nos = [id, id2, id3].map(i => /\d/.test(i));
			expect(id).to.be.a('string');
			expect(id).to.not.equal(id2);
			expect(id3).to.equal(id2);
			expect(nos).to.include(true);
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
});
