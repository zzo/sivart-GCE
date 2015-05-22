var Instance = require('../Instance');
var instanceName = process.argv[3];

console.log('IN: ' + instanceName);
describe('Instance get', function() {
  it('gets an IP address', function(done) {
    var instance = Instance.Factory('slave', instanceName);
    instance.getIP(function(err, ip) {
      expect(err).toBeNull();
      expect(ip).toMatch(/\d+\.\d+\.\d+\.\d+/);
      done();
    });
  });
});
