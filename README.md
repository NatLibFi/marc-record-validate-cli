# marc-record-validate-cli

[![Build Status](https://travis-ci.org/NatLibFi/marc-record-validate-cli.svg?branch=master)](https://travis-ci.org/NatLibFi/marc-record-validate-cli)
[![Coverage Status](https://coveralls.io/repos/github/NatLibFi/marc-record-validate-cli/badge.svg?branch=master)](https://coveralls.io/github/NatLibFi/marc-record-validate-cli?branch=master)

### Description

A command-line client for validating and updating MARC records using [marc-record-validate](https://github.com/NatLibFi/marc-record-validate) type validators.

### Configuration and setup

Clone the repository and install deps by running `npm install`.

Setup the desired validators in `config.js`.

Set the environment variables `VALIDATE_USER`, `VALIDATE_PASS` and `VALIDATE_API`.

Build by running `npm run build`.

### Usage

Run by `node build/cli.js <options>`.

The client supports the following flags:

* -h, --help - Show help
* -s, --show - Prints a record in the terminal. Example: `node build/cli.js -s 12345`.
* -v, --validate - Validate a single record without updating the database. Takes a record id as a parameter. Example: `node build/cli.js -v 12394`.
* -f, --fix - Validates and fixes a single record and updates it in the database. Example: `node build/cli.js -f 12394`.
* -l, --localfix - Validates and fixes a single record and saves the updated record locally (as MARCXML). Example: `node build/cli.js -l 12394`.
* -x, --filefix - Validates and fixes record(s) from a local file, saves the result locally. The input records can be in ISO2709, MARCXML or Aleph Sequential file format, the output is in MARCXML. Example: `node build/cli.js -x inputrecs.mrc`.
* -m, --fixmultiple - Reads multiple record ids from a local file, validates and fixes them in the database. Example: `node build/cli.js -m lotsofrecs.txt`.
  * When using the flag -m, you can add an optional flag `-c` / `--chunksize` for specifying the chunk size for the batch operation, i.e. how large a set of records is processed simultaneously. By default this value is 5. If `chunksize` is set to 1, records are processed synchronously. Example: `node build/cli.js -m lotsofrecs.txt -c 10`.
  * You can also set an optional flag `-t / --timeinterval` for setting up a time range in which to run long-running operations. The value of -t must be in the format `18-06`, i.e. hours in two-number format separated by a hyphen. Example `node build/cli.js -m lotsofrecs.txt -c 10 -t 20-06`.

### License and copyright

Copyright (c) 2017-2018 University Of Helsinki (The National Library Of Finland)

This project's source code is licensed under the terms of GNU Affero General Public License Version 3 or any later version.
