import _ from 'lodash';
import pino from 'pino';
import WrappedLogger from './WrappedLogger';

export default class ConfiguredLogstash {
  constructor(context, options) {
    const opts = options || {};
    this.shutdownFunctions = [];
    this.addCounter = opts.addCounter;

    // Make pino format look MOSTLY like old winston format
    const cleanOptions = _.pick(opts, [
      'name', 'level', 'redact', 'serializers', 'enabled',
      'crlf', 'messageKey', 'useLevelLabels',
    ]);
    if (opts.meta) {
      cleanOptions.base = opts.meta;
    }
    if ('addTimestamp' in opts) {
      cleanOptions.timestamp = opts.addTimestamp;
    }
    if ('prettyPrint' in opts) {
      cleanOptions.prettyPrint = {
        colorize: true,
        translateTime: 'SYS:h:MM:ss.l TT', // Human-readable time in system timezone
      };
    }

    let dest;
    if (opts.extreme === true && !opts.file) {
      dest = pino.extreme();
    } else if (opts.extreme || opts.file) {
      dest = pino.extreme(opts.extreme || options.file);
    } else if (opts.file) {
      dest = pino.desintation(opts.file);
    }
    if (dest) {
      this.flushSync = () => dest.flushSync();
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
    return this.rootLogger;
  }

  async stop() {
    if (this.flushSync) {
      this.flushSync();
    }
  }
}
