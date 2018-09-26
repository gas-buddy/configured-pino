configured-pino
==================

[![Greenkeeper badge](https://badges.greenkeeper.io/gas-buddy/configured-pino.svg)](https://greenkeeper.io/)

[![wercker status](https://app.wercker.com/status/da2d2c976707ed882927a16eeff0f255/s/master "wercker status")](https://app.wercker.com/project/byKey/da2d2c976707ed882927a16eeff0f255)
[![Coverage Status](https://coveralls.io/repos/github/gas-buddy/configured-pino/badge.svg?branch=master)](https://coveralls.io/github/gas-buddy/configured-pino?branch=master)

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