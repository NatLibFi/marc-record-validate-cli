/**
 * A function that takes a record id as a parameter and return the previous
 * version of the record in marc-record-js format.
 */

import 'babel-polyfill';
import request from 'request';
import * as _ from 'lodash';
import rp from 'request-promise-native';

export async function getRecordData(id) {
  return rp(`http://replikointi-kk.lib.helsinki.fi/cvs/${id}`)
    .then(body => {
      const res = _.chain(body.match(new RegExp('/revs/.*>', 'g')))
        .map(result => `http://replikointi-kk.lib.helsinki.fi${result.split("\">")[0]}`)
        .uniq()
        .value();
      const [head, second, ...tail] = res;
      return second;
    })
    .catch(err => console.log(err));
}

getRecordData(process.argv[2]).then(jou => console.log(jou));
