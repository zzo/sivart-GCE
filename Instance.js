'use strict';

var GCE = require('./index');
var Auth = require('./Auth');
var fs = require('fs');
var uuid = require('uuid');
var path = require('path');
var ursa = require('ursa');

var buildTypes = {
  slave: {
    instance: fs.readFileSync(path.join(__dirname, 'instances', 'slave.json'), 'utf8')
  },
  github: {
    instance: fs.readFileSync(path.join(__dirname, 'instances', 'github.json'), 'utf8'),
    script: fs.readFileSync(path.join(__dirname, 'instances', 'github_startup.sh'), 'utf8')
  },
  ui: {
    instance: fs.readFileSync(path.join(__dirname, 'instances', 'ui.json'), 'utf8'),
    script: fs.readFileSync(path.join(__dirname, 'instances', 'ui_startup.sh'), 'utf8')
  },
  'slave-snapshot': {
    instance: fs.readFileSync(path.join(__dirname, 'images', 'slave.json'), 'utf8'),
    script: fs.readFileSync(path.join(__dirname, 'images', 'slave_startup.sh'), 'utf8')
  },
  'github-snapshot': {
    instance: fs.readFileSync(path.join(__dirname, 'images', 'github.json'), 'utf8'),
    script: fs.readFileSync(path.join(__dirname, 'images', 'github_startup.sh'), 'utf8')
  }
};

function Instance(projectId, zone, instanceName, type) {
  this.projectId = projectId;
  this.instanceName = instanceName;
  this.zone = zone;
  this.gce = new GCE(projectId, zone);

  if (type) {
    this.type = type;
    this.instanceBuildInfo = JSON.parse(buildTypes[this.type].instance);
    this.diskName = this.instanceBuildInfo.disks[0].deviceName;
    this.instanceBuildInfo.name = this.instanceName;
  }
}

// TODO(trostler): only export this function
Instance.Factory = function(type, xtra) {
  switch (type) {
    case 'slave':
      return Instance.Slave(xtra);
      break;
    case 'github':
      return Instance.GithubListener();
      break;
    case 'ui':
      return Instance.UI();
      break;
    case 'slave-snapshot':
      return Instance.SlaveSnapshot();
      break;
    case 'github-snapshot':
      return Instance.GithubSnapshot();
      break;
    default:
      throw new Error('I do not know instance type ' + type);
      break;
  }
};

Instance.Slave = function(iName) {
  // some krazy random name
  var instanceName = iName || ['x', new Date().getTime(), uuid.v4()].join('-').slice(0, 63);
  var newSlave = new Instance(Auth.projectId, Auth.zone, instanceName, 'slave');
  if (!iName) {
    // Generate a new pub/priv key pair
    var keys = ursa.generatePrivateKey();
    var pubSsh = keys.toPublicSsh('base64');
    newSlave.instanceBuildInfo.metadata.items.push({
      key: 'sshKeys',
      value: [ 'sivart:ssh-rsa', pubSsh, 'sivart'].join(' ')
    });
    newSlave.privateKey = keys.toPrivatePem('base64');
  }
  return newSlave;
};

Instance.SlaveSnapshot = function() {
  return new Instance(Auth.projectId, Auth.zone, 'slave-snapshot', 'slave-snapshot');
};

Instance.GithubListener = function() {
  return new Instance(Auth.projectId, Auth.zone, 'github', 'github');
};

Instance.UI = function() {
  return new Instance(Auth.projectId, Auth.zone, 'ui', 'ui');
};

Instance.GithubSnapshot = function() {
  return new Instance(Auth.projectId, Auth.zone, 'github-snapshot', 'github-snapshot');
};

Instance.prototype.build = function(script, cb) {

  if (typeof script === 'function') {
    cb = script;
    script = buildTypes[this.type].script;
  }

  this.instanceBuildInfo.metadata.items[0].value = script;
  this.create({ instance: this.instanceBuildInfo }, cb);
};

/*
 * Create a GCE VM instance
 */
Instance.prototype.create = function(args, cb) {
  var me = this;
  this.gce.start(function() {
    var data = args.instance;

    if (args.file) {
      data = JSON.parse(fs.readFileSync(args.file));
    }

    me.gce.createInstance(data, cb);
  });
};

/*
 * Delete a GCE VM instance
 */
Instance.prototype.delete = function(cb) {
  var me = this;
  this.gce.start(function() {
    me.gce.deleteInstance(me.instanceName, cb);
  });
};

Instance.prototype.get = function(cb) {
  this.gce.getInstance({ instance: this.instanceName }, cb);
};

Instance.prototype.getSerialConsoleOutput = function(cb) {
  var me = this;
  this.gce.start(function() {
    me.gce.getSerialConsoleOutput({ instance: me.instanceName }, cb);
  });
};

// Send console lines while still wanted.
Instance.prototype.tail_gce_console = function(cb) {
    var me = this;
    var seen_length = 0;
    this.gce.start(function() {
      function getout() {
        me.gce.getSerialConsoleOutput({ instance: me.instanceName }, function(err, total_output) {
          if (!err) {
            var contents = total_output.contents;
            contents = contents.slice(seen_length);
            seen_length += contents.length;
            var stop = cb(null, contents);
            if (!stop) {
              setTimeout(getout, 5000);
            }
          } else {
            cb('error getting serial console output: ' + err);
          }
        });
      }
      getout();
    });
};

module.exports = Instance;
