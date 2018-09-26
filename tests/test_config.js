import tap from 'tap';
import LogConfig from '../src/index';

tap.test('test_spans', async (t) => {
  const configured = new LogConfig({ name: 'test' }, { extreme: true, level: 'warn' });
  const logger = await configured.start();
  logger.warn('Extreme mode');
  await configured.stop();
  t.ok('Extreme mode shutdown properly');
});
