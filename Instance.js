var GCE = require('./index');
var fs = require('fs');

function Instance(projectId, zone, instanceName) {
  this.projectId = projectId;
  this.instanceName = instanceName;
  this.zone = zone;
  this.gce = new GCE(projectId, zone);
}

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


/**
 * Send console lines while still wanted.
 */
Instance.prototype.tail_gce_console = function(cb) {
    var me = this;
    var seen_output = '';
    this.gce.start(function() {
      function getout() {
        me.gce.getSerialConsoleOutput({ instance: me.instanceName }, function(err, total_output) {
          if (!err) {
            var contents = total_output.contents;
            contents.replace(seen_output, '');
            seen_output += contents;
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
