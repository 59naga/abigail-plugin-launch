Abigail Launch Plugin
---

<p align="right">
  <a href="https://npmjs.org/package/abigail-plugin-launch">
    <img src="https://img.shields.io/npm/v/abigail-plugin-launch.svg?style=flat-square">
  </a>
  <a href="https://travis-ci.org/abigailjs/abigail-plugin-launch">
    <img src="http://img.shields.io/travis/abigailjs/abigail-plugin-launch.svg?style=flat-square">
  </a>
  <a href="https://codeclimate.com/github/abigailjs/abigail-plugin-launch/coverage">
    <img src="https://img.shields.io/codeclimate/github/abigailjs/abigail-plugin-launch.svg?style=flat-square">
  </a>
  <a href="https://codeclimate.com/github/abigailjs/abigail-plugin-launch">
    <img src="https://img.shields.io/codeclimate/coverage/github/abigailjs/abigail-plugin-launch.svg?style=flat-square">
  </a>
  <a href="https://gemnasium.com/abigailjs/abigail-plugin-launch">
    <img src="https://img.shields.io/gemnasium/abigailjs/abigail-plugin-launch.svg?style=flat-square">
  </a>
</p>

No installation
---
> abigail built-in plugin

Usage
---
this plugin is simulator body. when receiving the launch event of abigail, evaluates its first arguments.

currently, the option are undefined. __please don't disable this plugin__, [exit](https://github.com/abigailjs/abigail-plugin-exit#usage) and [watch](https://github.com/abigailjs/abigail-plugin-watch#usage) doesn't work correctly.

in your plugin, if the task is to be executed at any time, you can run the task after getting the instance using `this.getPlugin`.

```js
class YourPlugin extends Plugin {
  pluginWillAttach() {
    const launchPlugin = this.getPlugin('launch');
    launchPlugin.abort();
    launchPlugin.launch(this.parent.task);
  }
}
```

> see also: [abigail-plugin-watch/src/index.js:83](https://github.com/abigailjs/abigail-plugin-watch/blob/v0.0.4/src/index.js#L83)

## use `abigail.plugins.launch` field in `package.json`

```js
{
  // ...
  "abigail": {
    "plugins": {
      // change to strict launch
      "launch": "bail"
    }
  }
}
```

See also
---
* [abigailjs/abigail](https://github.com/abigailjs/abigail#usage)
* [abigailjs/abigail-plugin](https://github.com/abigailjs/abigail-plugin#usage)

Development
---
Requirement global
* NodeJS v5.7.0
* Npm v3.7.1

```bash
git clone https://github.com/abigailjs/abigail-plugin-launch
cd abigail-plugin-launch
npm install

npm test
```

License
---
[MIT](http://abigailjs.mit-license.org/)
