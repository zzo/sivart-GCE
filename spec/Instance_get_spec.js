var Instance = require('../Instance');

describe('Instance get', function() {
  it('gets an IP address', function(done) {
    var instance = Instance.Factory('slave', 'x-1432306238698-e8a00563-c526-4950-ae63-423b05f8a8de');
    instance.getIP(function(err, ip) {
      expect(err).toBeNull();
      expect(ip).toMatch(/\d+\.\d+\.\d+\.\d+/);
      done();
    });
  });
});
