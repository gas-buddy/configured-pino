const metadataBlacklist = (process.env.NODE_ENV === 'production') ? [
  'response',
  '_object', // joi validation errors put the (potentially sensitive) json here
] : ['response']; // With a cluster-wide proxy, printing response even in dev is just annoying

/* Replace properties are deeper than 5 levels with "[Too Deep]"
    Replace functions with "[Function]".
    Replace duplicate objects with "[Duplicate]".
    Replace blacklisted properties with "[Blacklisted]"
*/
function trimMetadata(object, depth, traversedObjects) {
  if (typeof object !== 'object' || !object) {
    return object;
  }

  if (object instanceof Buffer) {
    return '[Buffer]';
  }

  if (depth > 5) {
    return '[Too Deep]';
  }

  const props = Object.getOwnPropertyNames(object);
  const copy = {};
  props.forEach((k) => {
    if (metadataBlacklist.includes(k)) {
      copy[k] = '[Blacklisted]';
      return;
    }

    const v = object[k];
    if (typeof v === 'function') {
      copy[k] = '[Function]';
    } else if (traversedObjects.includes(v) && String(v).length > 12) {
      copy[k] = '[Duplicate]';
    } else {
      traversedObjects.push(v);
      if (typeof v === 'object' && v) {
        copy[k] = trimMetadata(v, depth + 1, traversedObjects);
      } else {
        copy[k] = v;
      }
    }
  });

  return copy;
}

export default class WrappedLogger {
  static IS_PINO = Symbol('Pino root logger marker')

  constructor(logger, additionalMetadata, options) {
    this.logger = logger;
    this.meta = additionalMetadata;
    this.counter = 1;

    if (logger.spanContext) {
      // Inherit the parent context
      const { id } = logger.spanContext;
      logger.spanContext.allocatedCount = (logger.spanContext.allocatedCount || 0) + 1;
      this.spanContext = {
        id: `${id || ''}${id ? '.' : ''}${logger.spanContext.allocatedCount}`,
      };
    } else if (options && options.spanId) {
      // Externally created context
      this.spanContext = { id: options.spanId };
    }

    const needsDynamic = this.spanContext
      || (options && (options.addTimestamp || options.addCounter));
    if (needsDynamic) {
      this.dynamic = () => {
        const addl = {};

        if (options) {
          if (options.addTimestamp) {
            addl.ts = Date.now();
          }
          if (options.addCounter) {
            const ctr = this.counter;
            this.counter += 1;
            addl.ctr = ctr;
          }
        }
        if (this.spanContext) {
          addl.sp = this.spanId;
        }

        return addl;
      };
    }
  }

  applyAdditionalMetadata(meta) {
    const metaWrap = typeof meta === 'object' ? meta : { meta };
    const fullMeta = meta ? trimMetadata(metaWrap, 0, []) : {};

    // Because of the ordering, passed in metadata wins
    if (this.meta) {
      if (typeof this.meta === 'function') {
        return this.meta(fullMeta);
      }
      const base = this.dynamic ? this.dynamic() : {};
      return Object.assign(base, this.meta, fullMeta);
    }
    if (this.dynamic) {
      return Object.assign(this.dynamic(), fullMeta);
    }
    return fullMeta;
  }

  loggerWithNewSpan() {
    if (!this.spanContext) {
      this.spanContext = {};
    }
    return new WrappedLogger(this);
  }

  get spanId() {
    return this.spanContext ? this.spanContext.id : undefined;
  }

  debug(msg, meta) {
    if (this.logger[WrappedLogger.IS_PINO]) {
      return this.logger.debug(this.applyAdditionalMetadata(meta), msg);
    }
    return this.logger.debug(msg, this.applyAdditionalMetadata(meta), msg);
  }

  info(msg, meta) {
    if (this.logger[WrappedLogger.IS_PINO]) {
      return this.logger.info(this.applyAdditionalMetadata(meta), msg);
    }
    return this.logger.info(msg, this.applyAdditionalMetadata(meta), msg);
  }

  warn(msg, meta) {
    if (this.logger[WrappedLogger.IS_PINO]) {
      return this.logger.warn(this.applyAdditionalMetadata(meta), msg);
    }
    return this.logger.warn(msg, this.applyAdditionalMetadata(meta), msg);
  }

  error(msg, meta) {
    if (this.logger[WrappedLogger.IS_PINO]) {
      return this.logger.error(this.applyAdditionalMetadata(meta), msg);
    }
    return this.logger.error(msg, this.applyAdditionalMetadata(meta), msg);
  }

  loggerWithDefaults(meta, options) {
    return new WrappedLogger(this, meta, options);
  }
}
