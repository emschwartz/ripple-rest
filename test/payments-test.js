var expect   = require('chai').expect;
var ripple   = require('ripple-lib');
var payments = require('../api/payments');

describe('api/payments', function(){

  describe('.submitPayment()', function(){

    it('should produce an error if the payment is missing', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = new ripple.Remote({
        servers: [ ],
        storage: dbinterface
      });
       
      var Server = new process.EventEmitter;
       
      Server._lastLedgerClose = Date.now() - 1;
       
      remote._getServer = function() {
        return Server;
      };

      payments.submit({
        remote: remote,
        dbinterface: dbinterface,
        config: {
          get: function(key) {
            if (key === 'PORT') {
              return 5990;
            } else {
              throw new Error('Not implemented');
            }
          }
        }
      }, {
        body: {
          secret: 'somesecret',
          client_resource_id: 'someid'
        },
        protocol: 'http',
        host: 'localhost'
      }, {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.success).to.be.false;
          expect(json_response.message).to.contain('payment');
          done();
        }
      });
    });

    it('should produce an error if the secret is missing', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = new ripple.Remote({
        servers: [ ],
        storage: dbinterface
      });
       
      var Server = new process.EventEmitter;
       
      Server._lastLedgerClose = Date.now() - 1;
       
      remote._getServer = function() {
        return Server;
      };

      payments.submit({
        remote: remote,
        dbinterface: dbinterface,
        config: {
          get: function(key) {
            if (key === 'PORT') {
              return 5990;
            } else {
              throw new Error('Not implemented');
            }
          }
        }
      }, {
        body: {
          payment: {
            source_account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
            destination_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
            destination_amount: {
              value: '1',
              currency: 'XRP',
              issuer: ''
            }
          },
          client_resource_id: 'someid'
        },
        protocol: 'http',
        host: 'localhost'
      }, {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.success).to.be.false;
          expect(json_response.message).to.contain('secret');
          done();
        }
      });
    });

    it('should produce an error if the client_resource_id is missing', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = new ripple.Remote({
        servers: [ ],
        storage: dbinterface
      });
       
      var Server = new process.EventEmitter;
       
      Server._lastLedgerClose = Date.now() - 1;
       
      remote._getServer = function() {
        return Server;
      };

      payments.submit({
        remote: remote,
        dbinterface: dbinterface,
        config: {
          get: function(key) {
            if (key === 'PORT') {
              return 5990;
            } else {
              throw new Error('Not implemented');
            }
          }
        }
      }, {
        body: {
          payment: {
            source_account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
            destination_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
            destination_amount: {
              value: '1',
              currency: 'XRP',
              issuer: ''
            }
          },
          secret: 'somesecret'
        },
        protocol: 'http',
        host: 'localhost'
      }, {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.success).to.be.false;
          expect(json_response.message).to.contain('client_resource_id');
          done();
        }
      });
    });

    it('should produce an error if the client_resource_id is invalid', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = new ripple.Remote({
        servers: [ ],
        storage: dbinterface
      });
       
      var Server = new process.EventEmitter;
       
      Server._lastLedgerClose = Date.now() - 1;
       
      remote._getServer = function() {
        return Server;
      };

      payments.submit({
        remote: remote,
        dbinterface: dbinterface,
        config: {
          get: function(key) {
            if (key === 'PORT') {
              return 5990;
            } else {
              throw new Error('Not implemented');
            }
          }
        }
      }, {
        body: {
          payment: {
            source_account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
            destination_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
            destination_amount: {
              value: '1',
              currency: 'XRP',
              issuer: ''
            }
          },
          secret: 'somesecret',
          client_resource_id: 'invalid\nclient_resource_id'
        },
        protocol: 'http',
        host: 'localhost'
      }, {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.success).to.be.false;
          expect(json_response.message).to.contain('client_resource_id');
          done();
        }
      });
    });

    it('should produce an error if there is no connection to rippled', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = new ripple.Remote({
        servers: [ ],
        storage: dbinterface
      });
       
      var Server = new process.EventEmitter;
       
      Server._lastLedgerClose = Date.now() - (20 * 1000 + 1);
       
      remote._getServer = function() {
        return Server;
      };

      payments.submit({
        remote: remote,
        dbinterface: dbinterface,
        config: {
          get: function(key) {
            if (key === 'PORT') {
              return 5990;
            } else {
              throw new Error('Not implemented');
            }
          }
        }
      }, {
        body: {
          payment: {
            source_account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
            destination_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
            destination_amount: {
              value: '1',
              currency: 'XRP',
              issuer: ''
            }
          },
          secret: 'somesecret',
          client_resource_id: 'someid'
        },
        protocol: 'http',
        host: 'localhost'
      }, {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.success).to.be.false;
          expect(json_response.message).to.contain('rippled');
          done();
        }
      });
    });

    // it('should produce an error if the payment is invalid', function(){

    // });

    // it('should respond with the client_resource_id and the status_url if the submission was successful', function(){

    // });

    // it('should respond with an error if the submission was immediately unsuccessful', function(){

    // });

  });

});
