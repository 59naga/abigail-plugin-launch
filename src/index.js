// dependencies
import Promise from 'bluebird';
import Plugin from 'abigail-plugin';
import spawn from 'cross-spawn';
import { exec } from 'child_process';
import semver from 'semver';

// @class Launch
export default class Launch extends Plugin {
  /**
  * @static
  * @property defaultOptions
  */
  static defaultOptions = {
    bail: true,
  };

  /**
  * @constructor
  * @param {AsyncEmitter} parent - the abigail instance
  * @param {string|number} value - a plugin command line argument value(ignore the boolean)
  * @param {object} [options={}] - passed from package.json `abigail>plugins` field
  */
  constructor(...args) {
    super(...args);

    // turn off the bail option if value is 'force' (eg `$abby test --launch force`)
    if (this.opts.value === 'force') {
      this.opts.bail = false;
    }
  }

  /**
  * @method pluginWillAttach
  * @returns {undefined}
  */
  pluginWillAttach() {
    this.subscribe('launch', () => this.launch(this.getProps().task, this.opts));
  }

  /**
  * @method pluginWillDetach
  * @returns {undefined}
  */
  pluginWillDetach() {
    this.abort();
  }

  /**
  * @method launch
  * @param {array} task - a the represents the execution order of the script
  * @param {object} [options={}] - pass to .launchSerial
  * @returns {promise} results - the script results
  * @see abigail/utils/parse
  */
  launch(task = [], options = {}) {
    return this.parent.emit('task-start', task)
    .then(() =>
      Promise.all(
        task.map((serials) =>
          serials.reduce(
            (promise, paralell) =>
              promise.then((paralellResults) => {
                const paralellResult = (paralellResults[paralellResults.length - 1] || []);
                const latestResult = paralellResult[paralellResult.length - 1] || {};
                if (options.bail && latestResult.exitCode) {
                  return Promise.resolve(paralellResults);
                }
                return Promise.all(paralell.map((serial) => this.launchSerial(serial, options)))
                .then((results) => paralellResults.concat(results));
              }),
            Promise.resolve([]),
          )
        )
      )
    )
    .then((results) =>
      this.parent.emit('task-end', results)
      .then(() => results)
    );
  }

  /**
  * @method launchSerial
  * @param {object} serial - a object with the pre,main,post as Script instance.
  * @param {object} [options={}] - pass to .childProcess
  * @returns {promise<array>} scriptResults - object converted Script instance with a result status
  */
  launchSerial(serial, options = {}) {
    const scripts = [];

    const { pre, main, post } = serial;
    if (pre) {
      scripts.push(pre);
    }
    if (main) {
      scripts.push(main);
    }
    if (post) {
      scripts.push(post);
    }

    return scripts.reduce(
      (promise, script) =>
        promise.then((scriptResults) => {
          const latestResult = (scriptResults[scriptResults.length - 1] || []) || {};
          if (options.bail && latestResult.exitCode) {
            return Promise.resolve(scriptResults);
          }
          return this.childProcess(script, options)
          .then(scriptResult => scriptResults.concat(scriptResult));
        }),
      Promise.resolve([]),
    );
  }

  /**
  * @method childProcess
  * @param {Script} script - run the script
  * @returns {object} scriptResult - script instance with start(time), end(time), exitCode, error
  */
  childProcess(script, options = {}) {
    const opts = Object.assign({ cwd: process.cwd(), stdio: 'inherit' }, options);
    const start = Date.now();

    return this.parent.emit('script-start', { script, start })
    .then(() =>
      new Promise((resolve) => {
        let child;
        if (script.canSpawn) {
          const [command, ...args] = script.parsed;
          child = spawn(command, args, opts);
        } else if (semver.gt(process.version, '5.6.0')) {
          // child_process.spawn {shell} available at version gt 5.6
          // fix: abigailjs/abigail#4
          child = spawn(script.raw, { ...opts, shell: true });
        } else {
          child = exec(script.raw, opts);
          // TODO: memory leak detected
          if (opts.stdio === 'inherit') {
            child.stdin.pipe(process.stdin);
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
          }
        }

        child.once('error', (error) => {
          const end = Date.now();
          const exitCode = 1;

          const result = { script, start, end, exitCode, error };
          this.parent.emit('script-error', result).then(() => resolve(result));
        });
        child.once('exit', (exitCode) => {
          const end = Date.now();
          const result = { script, start, end, exitCode };
          this.parent.emit('script-end', result).then(() => resolve(result));
        });
      })
    );
  }
}
