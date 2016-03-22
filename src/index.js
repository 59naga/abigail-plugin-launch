// dependencies
import Promise from 'bluebird';
import Plugin from 'abigail-plugin';
import spawn from 'cross-spawn';
import { exec } from 'child_process';

// @class Launch
export default class Launch extends Plugin {
  /**
  * @method abort
  * @returns {undefined}
  */
  abort() {
    super.abort();
    this.parent.removeListener('launch', this._launch);
  }

  /**
  * @method pluginWillAttach
  * @returns {undefined}
  */
  pluginWillAttach() {
    /**
    * @listens this.parent#launch
    * @param {array} task - a the represents the execution order of the script
    * @returns {promise} results - the script results
    */
    this._launch = (...args) => this.launch(...args);
    this.parent.on('launch', this._launch);
  }

  /**
  * @method pluginWillDetach
  * @param {number} [exitCode=null] - process exit code
  * @returns {undefined}
  */
  pluginWillDetach() {
    this.parent.removeListener('launch', this._launch);
  }

  /**
  * @method launch
  * @param {array} launch - a the represents the execution order of the script
  * @param {object} [options={}] - pass to .launchSerial
  * @returns {promise} results - the script results
  * @see abigail/utils/parse
  */
  launch(paralells = [], options = {}) {
    return Promise.all(
      paralells.map((serials) =>
        serials.reduce(
          (promise, paralell) =>
            promise.then((paralellResults) =>
              Promise.all(paralell.map((serial) => this.launchSerial(serial, options)))
              .then((results) => paralellResults.concat(results))
            ),
          Promise.resolve([]),
        )
      )
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
        promise.then((scriptResults) =>
          this.childProcess(script, options)
          .then(scriptResult => scriptResults.concat(scriptResult)
        )
      ),
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
    return new Promise((resolve) => {
      let child;
      if (script.canSpawn) {
        const [command, ...args] = script.parsed;
        child = spawn(command, args, opts);
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
        resolve({ script, start, end, exitCode, error });
      });
      child.once('exit', (exitCode) => {
        const end = Date.now();
        resolve({ script, start, end, exitCode });
      });
    });
  }
}
