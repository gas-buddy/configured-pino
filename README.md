configured-pino
==================

[![Greenkeeper badge](https://badges.greenkeeper.io/gas-buddy/configured-pino.svg)](https://greenkeeper.io/)

[![wercker status](https://app.wercker.com/status/0c57068422ba008f646fc541d8357308/s/master "wercker status")](https://app.wercker.com/project/byKey/0c57068422ba008f646fc541d8357308)
[![Coverage Status](https://coveralls.io/repos/github/gas-buddy/configured-winston/badge.svg?branch=master)](https://coveralls.io/github/gas-buddy/configured-winston?branch=master)

A trivial wrapper around [Pino](https://getpino.io) logging to be usable from existing @gasbuddy/service
infrastructure which was winston based.

Sample Configuration
====================
```
  "logger": {
    "module": "@gasbuddy/configured-pino",
    "level": "warn"
  }
```