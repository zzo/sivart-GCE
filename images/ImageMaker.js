'use strict';

var Instance = require('../Instance');
var printf = require('util').format;
var Q = require('q');
Q.longStackSupport = true;


function deleteExistingInstanceAndDisk(snapshot, cb) {
  snapshot.gce.start(function(err) {
    snapshot.gce.compute.disks.delete({disk: snapshot.diskName }, function() {
      snapshot.delete(cb);
    });
  });
}

// first try to delete imangeName and diskName
module.exports = function(type, imageName) {
  var snapshot = Instance.Factory(type);
  console.log('Delete any existing snapshot instance and disk...');
  deleteExistingInstanceAndDisk(snapshot, function() {
    console.log('creating instance...');
    Q.ninvoke(snapshot, 'build')
      .then(function() {
          console.log('waiting for instance...');
          var deferred = Q.defer();
          function getConsole() {
            snapshot.getSerialConsoleOutput(function(err, output) {
              if (err) {
                throw new Error(err);
              }
              var content = output.contents;
              console.log(content);
              if (content.toString().match('__ERROR__')) {
                throw new Error('Startup script errored out!');
              }
              if (content.toString().match('__DONE__')) {
                deferred.resolve();
              } else {
                setTimeout(getConsole, 10000);
              }
            });
          }
          getConsole();
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
  });
};
