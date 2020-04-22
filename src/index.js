import _ from 'lodash';
import pino from 'pino';
import WrappedLogger from './WrappedLogger';

const PRETTY = Symbol('Track whether pretty printing is enabled');

export default class ConfiguredPino {
  constructor(context, options) {
    const opts = options || {};
    this.shutdownFunctions = [];
    this.addCounter = opts.addCounter;

    // Make pino format look MOSTLY like old winston format
    const cleanOptions = _.pick(opts, [
      'name', 'level', 'redact', 'serializers', 'enabled',
      'crlf', 'messageKey',
    ]);
    if (opts.meta) {
      cleanOptions.base = opts.meta;
    }
    if ('addTimestamp' in opts) {
      cleanOptions.timestamp = opts.addTimestamp;
    }
    if (opts.prettyPrint === true) {
      cleanOptions.prettyPrint = {
        colorize: true,
        translateTime: 'SYS:h:MM:ss.l TT', // Human-readable time in system timezone
      };
    } else if ('prettyPrint' in opts) {
      cleanOptions.prettyPrint = opts.prettyPrint;
    }
    if (cleanOptions.prettyPrint) {
      this[PRETTY] = true;
    }

    let dest;
    if (opts.extreme === true && !opts.file) {
      dest = pino.destination({ sync: false });
    } else if (opts.extreme || opts.file) {
      dest = pino.destination({ sync: !opts.extreme, dest: options.file });
    } else if (opts.file) {
      dest = pino.destination(opts.file);
    }

    if (opts.useLevelLabels) {
      cleanOptions.formatters = cleanOptions.formatters || {};
      cleanOptions.formatters.level = level => ({ level });
    }

    if (dest) {
      this.flushSync = () => (this[PRETTY] ? dest.flush() : dest.flushSync());
    }
    this.pino = pino(cleanOptions, dest);
    this.pino[WrappedLogger.IS_PINO] = true;

    // We configure this right away - not waiting for start because
    // other hydrated objects probably want to have winston logging work
    this.pino.info('Configured pino logging');
  }

  // eslint-disable-next-line class-methods-use-this
  start() {
    this.rootLogger = new WrappedLogger(this.pino, this.meta, {
      addTimestamp: this.addTimestamp,
      addCounter: this.addCounter,
    });
    this.flushInterval = setInterval(() => this.pino.flush(), 10000).unref();
    if (!this[PRETTY]) {
      // use pino.final to create a special logger that
      // guarantees final tick writes
      let stop;
      const handler = pino.final(this.pino, (err, finalLogger, evt) => {
        if (!stop) {
          finalLogger.info(`configured-pino::${evt}`);
          if (err) { finalLogger.error('error caused exit', err); }
        }
      });
      // catch all the ways node might exit
      this.eventHandlers = {
        beforeExit() { handler(null, 'beforeExit'); stop = true; },
        exit() { handler(null, 'exit'); },
        uncaughtException(err) { handler(err, 'uncaughtException'); },
        SIGINT() { handler(null, 'SIGINT'); },
        SIGQUIT() { handler(null, 'SIGQUIT'); },
        SIGTERM() { handler(null, 'SIGTERM'); },
      };
      Object.entries(this.eventHandlers).forEach(([e, fn]) => process.on(e, fn));
    }
    return this.rootLogger;
  }

  async stop() {
    if (this.flushSync) {
      this.flushSync();
    }
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      delete this.flushInterval;
    }
    if (this.eventHandlers) {
      Object.entries(this.eventHandlers).forEach(([e, fn]) => process.removeListener(e, fn));
      delete this.eventHandlers;
    }
  }
}
