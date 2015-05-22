var Instance = require('../Instance');

describe('Instance get', function() {
  it('gets an IP address', function(done) {
    var instance = Instance.Factory('slave', 'x-1432304888869-0e78573f-e333-467c-8a0b-41f481ce1ff3');
    instance.getIP(function(err, ip) {
      expect(err).toBeNull();
      expect(ip).toMatch(/\d+\.\d+\.\d+\.\d+/);
      done();
    });
  });
});
