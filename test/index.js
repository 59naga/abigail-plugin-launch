// dependencies
import AsyncEmitter from 'carrack';
import flattenDeep from 'lodash.flattendeep';
import assert from 'power-assert';

// target
import Launch from '../src';

// environment
const allowableMillisecond = 30;
const options = {
  stdio: 'ignore',
};

// specs
describe('Launch', () => {
  describe('plugin lifecycle', () => {
    it('should start listening of `launch` in the `attach-plugins`', () => {
      const emitter = new AsyncEmitter;
      const launch = new Launch(emitter);
      const task = [[[{ main: { raw: 'echo foo' } }]]];

      return emitter.emit('attach-plugins').then(() =>
        emitter.emit('launch', task, options)
      )
      .then((results) => {
        assert(results.length === 1);
        assert(results[0][0][0][0].exitCode === 0);
      });
    });

    it('should end listening of `launch` in the `detach-plugins`', () => {
      const emitter = new AsyncEmitter;
      const launch = new Launch(emitter);

      return emitter.emit('attach-plugins').then(() =>
        emitter.emit('detach-plugins')
      )
      .then(() =>
        emitter.emit('launch')
      )
      .then((results) => {
        assert(results.length === 0);
      });
    });

    it('if run the abort, it should instantly suspend dependence on parent', () => {
      const emitter = new AsyncEmitter;
      const launch = new Launch(emitter);

      return emitter.emit('attach-plugins').then(() =>
        emitter.emit('detach-plugins')
      )
      .then(() => {
        launch.abort();
        return emitter.emit('launch');
      })
      .then((results) => {
        assert(results.length === 0);
      });
    });
  });
  describe('::launch', () => {
    const emitter = new AsyncEmitter;
    const launch = new Launch(emitter);

    it('if there is an object that has the main>raw in the 3d array, it should be run as a script', () => {
      const task = [[[
        { main: { raw: 'echo foo' } },
      ]]];

      return launch.launch(task, options)
      .then((scriptResults) => {
        const results = flattenDeep(scriptResults);

        assert(results[0].script.raw === task[0][0][0].main.raw);
        assert(results[0].exitCode === 0);
      });
    });

    it('if there are multiple scripts in the 1d array, should run in paralell', () => {
      const task = [
        [[{ main: { raw: 'echo foo && sleep 0.05' } }]],
        [[{ main: { raw: 'echo bar && sleep 0.05' } }]],
        [[{ main: { raw: 'echo baz && sleep 0.05' } }]],
      ];

      return launch.launch(task, options)
      .then((scriptResults) => {
        const results = flattenDeep(scriptResults);
        assert(results[0].script.raw === task[0][0][0].main.raw);
        assert(results[0].exitCode === 0);
        assert(results[1].script.raw === task[1][0][0].main.raw);
        assert(results[1].exitCode === 0);
        assert(results[2].script.raw === task[2][0][0].main.raw);
        assert(results[2].exitCode === 0);

        // run in paralell ?
        assert(results[1].start - results[0].start < allowableMillisecond);
        assert(results[2].start - results[1].start < allowableMillisecond);
      });
    });

    it('if there are multiple scripts in the 2d array, should run in serial', () => {
      const task = [[
        [{ main: { raw: 'echo foo && sleep 0.05' } }],
        [{ main: { raw: 'echo bar && sleep 0.05' } }],
        [{ main: { raw: 'echo baz && sleep 0.05' } }],
      ]];

      return launch.launch(task, options)
      .then((scriptResults) => {
        const results = flattenDeep(scriptResults);
        assert(results[0].script.raw === task[0][0][0].main.raw);
        assert(results[0].exitCode === 0);
        assert(results[1].script.raw === task[0][1][0].main.raw);
        assert(results[1].exitCode === 0);
        assert(results[2].script.raw === task[0][2][0].main.raw);
        assert(results[2].exitCode === 0);

        // run in serial ?
        assert(results[0].end <= results[1].start);
        assert(results[1].end <= results[2].start);
      });
    });

    it('if there are multiple scripts in the 3d array, should run in paralell', () => {
      const task = [[[
        { main: { raw: 'echo foo && sleep 0.05' } },
        { main: { raw: 'echo bar && sleep 0.05' } },
        { main: { raw: 'echo baz && sleep 0.05' } },
      ]]];

      return launch.launch(task, options)
      .then((scriptResults) => {
        const results = flattenDeep(scriptResults);
        assert(results[0].script.raw === task[0][0][0].main.raw);
        assert(results[0].exitCode === 0);
        assert(results[1].script.raw === task[0][0][1].main.raw);
        assert(results[1].exitCode === 0);
        assert(results[2].script.raw === task[0][0][2].main.raw);
        assert(results[2].exitCode === 0);

        // run in paralell ?
        assert(results[1].start - results[0].start < allowableMillisecond);
        assert(results[2].start - results[1].start < allowableMillisecond);
      });
    });
  });

  describe('::launchSerial', () => {
    const emitter = new AsyncEmitter;
    const launch = new Launch(emitter);

    it('if pre and post is defined in object, to be run in serial', () => {
      const serial = {
        pre: { raw: 'echo foo && sleep 0.05' },
        main: { raw: 'echo bar && sleep 0.05' },
        post: { raw: 'echo baz && sleep 0.05' },
      };

      return launch.launchSerial(serial, options)
      .then((scriptResults) => {
        const results = flattenDeep(scriptResults);
        assert(results[0].script.raw === serial.pre.raw);
        assert(results[0].exitCode === 0);
        assert(results[1].script.raw === serial.main.raw);
        assert(results[1].exitCode === 0);
        assert(results[2].script.raw === serial.post.raw);
        assert(results[2].exitCode === 0);

        // run in serial ?
        assert(results[0].end <= results[1].start);
        assert(results[1].end <= results[2].start);
      });
    });
  });

  describe('::childProcess', () => {
    const emitter = new AsyncEmitter;
    const launch = new Launch(emitter);

    it('`canSpawn` is unless true, should run a `raw` in the exec', () => {
      const script = { raw: 'exit 1' };
      return launch.childProcess(script, options)
      .then((result) => {
        assert(result.script.raw === script.raw);
        assert(result.start);
        assert(result.end);
        assert(result.exitCode === 1);
      });
    });

    it('`canSpawn` is true, should run a `parsed` in the spawn', () => {
      const script = { parsed: ['exit', '1'], canSpawn: true };
      return launch.childProcess(script, options)
      .then((result) => {
        assert(result.script.parsed === script.parsed);
        assert(result.start);
        assert(result.end);
        assert(result.exitCode === 1);
      });
    });

    it('if abend and spawn, it should return the error and exitCode is 1', () => {
      const script = { parsed: ['unavailable-script'], canSpawn: true };
      return launch.childProcess(script, options)
      .then((result) => {
        assert(result.script.raw === script.raw);
        assert(result.start);
        assert(result.end);
        assert(result.exitCode === 1);
        assert(result.error.message === 'spawn unavailable-script ENOENT');
      });
    });
  });
});
