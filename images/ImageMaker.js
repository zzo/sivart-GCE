'use strict';

var Instance = require('../Instance');
var printf = require('util').format;
var Q = require('q');
Q.longStackSupport = true;

module.exports = function(type, imageName) {
  var snapshot = Instance.Factory(type);
  console.log(snapshot);
//  var instanceName = snapshot.instanceName;
//  var zone = snapshot.zone;
  console.log('creating instance...');
  Q.ninvoke(snapshot, 'build')
    .then(function() {
        console.log('waiting for instance...');
        var deferred = Q.defer();
        snapshot.tail_gce_console(function(err, data) {
          console.log(data);
          if (data.toString().match('__ALIVE__')) {
            deferred.resolve();
            return true;
          }
        });
/*
        function getConsole() {
          snapshot.getSerialConsoleOutput(function(err, output) {
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
        */
        return deferred.promise;
      }).then(function() {
        console.log('Image created - deleting instance...');
        return Q.ninvoke(snapshot, 'delete');
      }).then(function() {
        // authenticate with gce
        return Q.ninvoke(snapshot.gce, 'start');
      })
      .then(function(compute) {
        var deferred = Q.defer();
        console.log(printf('Deleting current "%s" image...', imageName));
        compute.images.delete({image: imageName }, function() {
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
        console.log('Create new image %s from %s', imageName, snapshot.diskName);
        return Q.ninvoke(compute.images, 'insert', {
          resource: {
            name: imageName,
            sourceDisk: printf('zones/%s/disks/%s', snapshot.zone, snapshot.diskName)
          }
        });
       })
      .then(function(imageInsertResponse) {
        console.log('Creating new image (be pateint!)...');
        return Q.ninvoke(snapshot.gce, 'waitForGlobalOperation', imageInsertResponse[0]);
      })
      .then(function() {
        return Q.ninvoke(snapshot.gce.compute.disks, 'delete', { disk: snapshot.diskName });
      })
      .then(function(deleteInsertResponse) {
        console.log('Deleting base disk (be pateint!)...');
        return Q.ninvoke(snapshot.gce, 'waitForZoneOperation', deleteInsertResponse[0]);
      }).then(function() {
        console.log(printf('All done!  New "%s" image successfully created', imageName));
      }).catch(function(error) {
        console.error('error');
        console.error(error);
      });
};
