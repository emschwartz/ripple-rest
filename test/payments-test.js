var chai         = require('chai');
var sinon        = require('sinon');
var sinonchai    = require('sinon-chai');
var expect       = chai.expect;
var ripple       = require('ripple-lib');
var payments     = require('../api/payments');
var transactions = require('../api/transactions');
var server_lib   = require('../lib/server-lib');
chai.use(sinonchai);

// Note that these tests use heavily stubbed versions of the 
// dependencies such as ripple-lib. These must be updated if 
// the dependencies are changed in any significant way

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
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() - server_lib.CONNECTION_TIMEOUT - 1 // Considered disconnected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){}
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
          expect(status_code).to.equal(500);
          expect(json_response.success).to.be.false;
          expect(json_response.message).to.contain('rippled');
          done();
        }
      });
    });

    it('should produce an error if the source_account is missing', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){}
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
            // source_account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
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
          expect(json_response.message).to.contain('source_account');
          done();
        }
      });
    });

    it('should produce an error if the source_account is invalid', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){}
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
            source_account: 'not an address',
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
          expect(json_response.message).to.contain('source_account');
          done();
        }
      });
    });

    it('should produce an error if the destination_account is missing', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){}
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
            // destination_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
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
          expect(json_response.message).to.contain('destination_account');
          done();
        }
      });
    });

    it('should produce an error if the destination_account is invalid', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){}
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
            destination_account: 'not an address',
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
          expect(json_response.message).to.contain('destination_account');
          done();
        }
      });
    });


    it('should produce an error if the destination_amount is missing', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){}
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
            // destination_amount: {
            //   value: '1',
            //   currency: 'XRP',
            //   issuer: ''
            // }
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
          expect(json_response.message).to.contain('destination_amount');
          done();
        }
      });
    });

    it('should produce an error if the destination_amount is invalid', function(done){
      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){}
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
              // value: '1',
              currency: 'XRP',
              issuer: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM'
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
          expect(json_response.message).to.contain('destination_amount');
          done();
        }
      });
    });

    it('should respond with the client_resource_id and the status_url if the submission was successful', function(done){

      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){},
        account: function(){
          return {
            submit: function(transaction){
              transaction.emit('proposed');
            }
          };
        }
      };

      payments.submit({
        remote: remote,
        dbinterface: dbinterface,
        config: {
          get: function(key) {
            if (key === 'PORT') {
              return 5990;
            } else {
              expect(false, 'Should not get here');
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
          expect(status_code).to.equal(200);
          expect(json_response.success).to.be.true;
          expect(json_response.client_resource_id).to.equal('someid');
          expect(json_response.status_url).to.equal('http://localhost:5990/v1/accounts/rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz/payments/someid');
          done();
        }
      });

    });

    it('should pass an error to the Express.js next function if there is an error after submission but before the "proposed" event', function(done){

      var dbinterface = {
        getTransaction: function(params, callback) {
          //console.log('dbinterface.getTransaction');
          callback();
        },
        saveTransaction: function(transaction, callback) {
          callback();
        }
      };
       
      var remote = {
        _getServer: function() {
          return {
            _lastLedgerClose: Date.now() // Considered connected
          };
        },
        once: function(){},
        on: function(){},
        connect: function(){},
        removeListener: function(){},
        account: function(){
          return {
            submit: function(transaction){
              transaction.emit('error', new Error('some error'));
            }
          };
        }
      };

      payments.submit({
        remote: remote,
        dbinterface: dbinterface,
        config: {
          get: function(key) {
            if (key === 'PORT') {
              return 5990;
            } else {
              expect(false, 'Should not get here');
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
          expect(false, 'Should not get here');
        }
      }, function(err){
        expect(err.message).to.equal('some error');
        done();
      });

    });

  });

  describe('.getPayment()', function(){

    it('should respond with an error if the account is missing', function(){

    });

    it('should respond with an error if the account is invalid', function(){

    });

    it('should respond with an error if the identifier is missing', function(){

    });

    it('should respond with an error if the identifier is invalid', function(){

    });

    it('should respond with an error if there is no connection to rippled', function(){

    });

    it('should respond with an error if no transaction is found for the given identifier', function(){

    });

    it('should respond with an error if the transaction is not a payment', function(){

    });

    it('should produce a payment object with all of the possible fields, even if they are empty strings', function(){

    });

  });

  describe('.getBulkPayments()', function(){

    it('should respond with an error if no account is specified', function(){

    });

    it('should respond with an error if there is no connection to rippled', function(){

    });

    it('should filter the results to include only payments', function(){

    });

    it('should produce an array of objects that have a "client_resource_id" field and a "payment" field', function(){

    });

    it('should filter the results based on source_account and destination_account, if specified', function(){

    });

    it('should filter the results based on the direction, if specified', function(){

    });

    it('should filter the results based on state (validated / failed), if specified', function(){

    });

  });

  describe('.getPathFind()', function(){

    it('should respond with an error if the source_account is missing', function(){

    });

    it('should respond with an error if the source_account is invalid', function(){

    });

    it('should respond with an error if the destination_account is missing', function(){

    });

    it('should respond with an error if the destination_account is invalid', function(){

    });

    it('should respond with an error if the destination_amount is missing', function(){

    });

    it('should respond with an error if the destination_amount is invalid', function(){

    });

    it('should respond with an error if the source_currencies list is invalid', function(){

    });

    it('should respond with an error if there is no connection to rippled', function(){

    });

    it('should convert the parameters into the form expected by ripple-lib', function(){

    });

    it('should add a direct XRP path where applicable (because rippled assumes the direct path is obvious)', function(){

    });

    it('should respond with an error if the destination_account does not accept the specified currency', function(){

    });

    it('shoudld respond with an error if there is no path found because of insufficient liquidity', function(){

    });

    it('should produce an array of properly formatted payment objects', function(){

    });

  });

});
