var google = require('googleapis');

function GCE(projectId, zone) {
  this.projectId = projectId;
  this.zone = zone;
}

GCE.prototype.start = function(cb) {
  var me = this;
  this.auth(function(token) {
    me.compute = google.compute({version: 'v1', auth: token,
      params: {zone: me.zone, project: me.projectId}});
    cb();
  });
};

GCE.prototype.auth = function(cb) {
  google.auth.getApplicationDefault(function(err, authClient) {
      if (err) {
      console.error('Failed to get the default credentials: ' + String(err));
      return;
    }

    // The createScopedRequired method returns true when running on GAE or a local developer 
    // machine. In that case, the desired scopes must be passed in manually. When the code is 
    // running in GCE or a Managed VM, the scopes are pulled from the GCE metadata server. 
    // See https://cloud.google.com/compute/docs/authentication for more information. 
    if (authClient.createScopedRequired && authClient.createScopedRequired()) {
      // Scopes can be specified either as an array or as a single, space-delimited string. 
      authClient = authClient.createScoped(['https://www.googleapis.com/auth/compute']);
    }

    cb(authClient);
  });
};

GCE.prototype.getZones = function(cb) {
  this.compute.zones.list({}, cb);
};

GCE.prototype.createInstance = function(instance, cb) {
  var request = { resource: instance };
  var me = this;
  this.compute.instances.insert(request, function(error, result) {
    if (error) {
      cb(error);
    } else if (result.kind == 'compute#operation') {
      me.waitForZoneOperation(result, cb);
    } else {
      cb(result);
    }
  });
};

GCE.prototype.deleteInstance = function(instance, cb) {
  var request = { instance: instance };
  var me = this;
  this.compute.instances.delete(request, function(error, result) {
    if (error) {
      cb(error);
    } else if (result.kind == 'compute#operation') {
      me.waitForZoneOperation(result, cb);
    } else {
      cb(result);
    }
  });
};

GCE.prototype.getZoneOperation = function(operation, cb) {
  this.compute.zoneOperations.get(operation, cb);
};

// TODO(zzo): set a global timeout to fail after!
GCE.prototype.waitForZoneOperation = function(res, cb) {
  var me = this;
  function waitforop() {
    me.getZoneOperation({operation: res.name}, function(error, resp) {
      if (error) {
        cb(error);
      } else if (resp.status == 'DONE') {
        cb(null, resp);
      } else {
        setTimeout(waitforop, 1000);
      }
    });
  }
  waitforop();
};

GCE.prototype.getSerialConsoleOutput = function(instance, cb) {
  this.compute.instances.getSerialPortOutput(instance, cb);
};

GCE.prototype.setMetaData = function(data, cb) {
  var me = this;
  console.log(data);
  this.compute.instances.setMetadata(data, function(error, result) {
    if (error) {
      cb(error);
    } else if (result.kind == 'compute#operation') {
      console.log(result);
      me.waitForZoneOperation(result, cb);
    } else {
      cb(null, result);
    }
  });
};

module.exports = GCE;
