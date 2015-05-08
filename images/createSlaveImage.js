'use strict';

var Instance = require('../Instance');
var printf = require('util').format;
var Q = require('q');
Q.longStackSupport = true;

var slaveImageName = 'slave-1';

var snapshot = Instance.SlaveSnapshot();
var instanceName = snapshot.instanceName;
var zone = snapshot.zone;

console.log('creating instance...');
Q.ninvoke(snapshot, 'build')
  .then(function(result) {
      console.log('waiting for instance...');
      var deferred = Q.defer();
      function getConsole() {
        snapshot.gce.getSerialConsoleOutput({ instance: instanceName }, function(err, output) {
          if (err) {
            throw new Error(err);
          }
          var content = output.contents;
          if (content.toString().match('__DONE__')) {
            console.log(content);
            deferred.resolve();
          } else {
            console.log(content);
            setTimeout(getConsole, 10000);
          }
        });
      }
      getConsole();
      return deferred.promise;
    }).then(function(result) {
      console.log('Image created - deleting instance...');
      return Q.ninvoke(snapshot, 'delete');
    }).then(function(result) {
      // authenticate with gce
      return Q.ninvoke(snapshot.gce, 'start');
    })
    .then(function(compute) {
      var deferred = Q.defer();
      console.log(printf('Deleting current "%s" image...', slaveImageName));
      compute.images.delete({image: slaveImageName }, function(err, resp) {
        /*
        console.log('Deleted current image:');
        console.log(err);
        console.log(resp);
        console.log('resolving promise');
        */
        // ignore errors
        deferred.resolve(compute);
      });
      return deferred.promise;
    })
    .then(function(compute) {
      console.log('Create new image %s from %s', slaveImageName, instanceName);
      return Q.ninvoke(compute.images, 'insert', {
        resource: {
          name: slaveImageName,
          sourceDisk: printf('zones/%s/disks/%s', zone, instanceName)
        }
      });
     })
    .then(function(imageInsertResponse) {
      console.log('Creating new image (be pateint!)...');
      return Q.ninvoke(snapshot.gce, 'waitForGlobalOperation', imageInsertResponse[0]);
    })
    .then(function() {
      return Q.ninvoke(snapshot.gce.compute.disks, 'delete', { disk: instanceName });
    })
    .then(function(deleteInsertResponse) {
      console.log('Deleting base disk (be pateint!)...');
      return Q.ninvoke(snapshot.gce, 'waitForZoneOperation', deleteInsertResponse[0]);
    }).then(function() {
      console.log(printf('All done!  New "%s" image successfully created', slaveImageName));
    }).catch(function(error) {
      console.error('error');
      console.error(error);
    });
