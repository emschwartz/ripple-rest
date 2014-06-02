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

  describe('.submit()', function(){

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

  describe('.get()', function(){

    it('should respond with an error if the account is missing', function(done){

      var $ = {};
      var req = {
        params: {
          identifier: 'someid'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.message).to.contain('account');
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    it('should respond with an error if the account is invalid', function(done){

      var $ = {};
      var req = {
        params: {
          account: 'not a valid account',
          identifier: 'someid'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.message).to.contain('account');
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    it('should respond with an error if the identifier is missing', function(done){

      var $ = {};
      var req = {
        params: {
          account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.message).to.contain('hash or client_resource_id');
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    it('should respond with an error if the account is invalid', function(done){

      var $ = {};
      var req = {
        params: {
          account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
          identifier: 'not\n a\n valid\n identifier\n'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.message).to.contain('hash or client_resource_id');
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    it('should respond with an error if there is no connection to rippled', function(done){

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() - server_lib.CONNECTION_TIMEOUT - 1 // Considered disconnected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        }
      };
      var req = {
        params: {
          account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
          identifier: 'someid'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(500);
          expect(json_response.message).to.contain('rippled');
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    it('should respond with an error if no transaction is found for the given identifier', function(done){

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){},
          requestTx: function(hash, callback){
            callback();
          }
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            callback();
          }
        }
      };
      var req = {
        params: {
          account: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz',
          identifier: 'FAKE6E9754025BA2534A78707605E0601F03ACE063687A0CA1BDDACFCD1698C7'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(404);
          expect(json_response.message).to.contain('Transaction not found');
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    it('should respond with an error if the transaction is not a payment', function(done){

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){},
          requestTx: function(hash, callback){
            callback(null, {
              "Account": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
              "Fee": "10",
              "Flags": 0,
              "Sequence": 1,
              "SigningPubKey": "02BC8C02199949B15C005B997E7C8594574E9B02BA2D0628902E0532989976CF9D",
              "TakerGets": "2000000",
              "TakerPays": {
                "currency": "BTC",
                "issuer": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
                "value": "1"
              },
              "TransactionType": "OfferCreate",
              "TxnSignature": "3045022100A3A1E59ABC619E212AED87E8E72A44FF6F5FB9866668A89EE818FD93CE66C8FB02207A290146B1438D16CE77976602C1E32070974A010A27355D574DF61A5B19E002",
              "hash": "389720F6FD8A144F171708F9ECB334D704CBCFEFBCDA152D931AC34FB5F9E32B",
              "inLedger": 95405,
              "ledger_index": 95405,
              "meta": {
                // Truncated
              }
            });
          },
          requestLedger: function(ledger_index, callback) {
            callback(null, {
              "ledger": {
                "accepted": true,
                "account_hash": "8993B803417A7EAAC0937778D94B76D63C73A907C7BDDF6B785C5D449DF34926",
                "close_time": 411616880,
                "close_time_human": "2013-Jan-16 02:01:20",
                "close_time_resolution": 10,
                "closed": true,
                "hash": "E8E3880B31BAD79D8D8EFADE645A71181F6B181FDD282555118A5233090BDE4A",
                "ledger_hash": "E8E3880B31BAD79D8D8EFADE645A71181F6B181FDD282555118A5233090BDE4A",
                "ledger_index": "95405",
                "parent_hash": "7175BCE102D9FF9237D6CB7F031FD02234CCC678FD4C7F71267AC2778853653D",
                "seqNum": "95405",
                "totalCoins": "99999999999990910",
                "total_coins": "99999999999990910",
                "transaction_hash": "0A5B102B91F3113C368D042EB642EA65D4AC4396766895660E0A2CE63B615E64"
              }
            });
          }
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            callback();
          }
        }
      };
      var req = {
        params: {
          account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
          identifier: '389720F6FD8A144F171708F9ECB334D704CBCFEFBCDA152D931AC34FB5F9E32B'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.message).to.contain('Not a payment');
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    it('should produce a payment object with all of the possible fields, even if they are empty strings', function(done){

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){},
          requestTx: function(hash, callback){
            callback(null, {
              "Account": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
              "Amount": {
                "currency": "USD",
                "issuer": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
                "value": "1"
              },
              "Destination": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
              "Fee": "10",
              "Flags": 0,
              "Paths": [
                [
                  {
                    "account": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "currency": "USD",
                    "issuer": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  }
                ],
                [
                  {
                    "account": "rD1jovjQeEpvaDwn9wKaYokkXXrqo4D23x",
                    "currency": "USD",
                    "issuer": "rD1jovjQeEpvaDwn9wKaYokkXXrqo4D23x",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  },
                  {
                    "account": "rB5TihdPbKgMrkFqrqUC3yLdE8hhv4BdeY",
                    "currency": "USD",
                    "issuer": "rB5TihdPbKgMrkFqrqUC3yLdE8hhv4BdeY",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  },
                  {
                    "account": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "currency": "USD",
                    "issuer": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  }
                ]
              ],
              "SendMax": {
                "currency": "USD",
                "issuer": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
                "value": "1.01"
              },
              "Sequence": 88,
              "SigningPubKey": "02EAE5DAB54DD8E1C49641D848D5B97D1B29149106174322EDF98A1B2CCE5D7F8E",
              "TransactionType": "Payment",
              "TxnSignature": "30440220791B6A3E036ECEFFE99E8D4957564E8C84D1548C8C3E80A87ED1AA646ECCFB16022037C5CAC97E34E3021EBB426479F2ACF3ACA75DB91DCC48D1BCFB4CF547CFEAA0",
              "hash": "E08D6E9754025BA2534A78707605E0601F03ACE063687A0CA1BDDACFCD1698C7",
              "inLedger": 348734,
              "ledger_index": 348734,
              "meta": {
                "AffectedNodes": [
                  {
                    "ModifiedNode": {
                      "FinalFields": {
                        "Account": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
                        "Balance": "59328999119",
                        "Flags": 0,
                        "OwnerCount": 11,
                        "Sequence": 89
                      },
                      "LedgerEntryType": "AccountRoot",
                      "LedgerIndex": "E0D7BDE68B468FF0B8D948FD865576517DA987569833A05374ADB9A72E870A06",
                      "PreviousFields": {
                        "Balance": "59328999129",
                        "Sequence": 88
                      },
                      "PreviousTxnID": "C26AA6B4F7C3B9F55E17CD0D11F12032A1C7AD2757229FFD277C9447A8815E6E",
                      "PreviousTxnLgrSeq": 348700
                    }
                  },
                  {
                    "ModifiedNode": {
                      "FinalFields": {
                        "Balance": {
                          "currency": "USD",
                          "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                          "value": "-1"
                        },
                        "Flags": 131072,
                        "HighLimit": {
                          "currency": "USD",
                          "issuer": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
                          "value": "100"
                        },
                        "HighNode": "0000000000000000",
                        "LowLimit": {
                          "currency": "USD",
                          "issuer": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
                          "value": "0"
                        },
                        "LowNode": "0000000000000000"
                      },
                      "LedgerEntryType": "RippleState",
                      "LedgerIndex": "EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959",
                      "PreviousFields": {
                        "Balance": {
                          "currency": "USD",
                          "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                          "value": "0"
                        }
                      },
                      "PreviousTxnID": "53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8",
                      "PreviousTxnLgrSeq": 343570
                    }
                  }
                ],
                "TransactionIndex": 0,
                "TransactionResult": "tesSUCCESS"
              },
              "validated": true
            });
          },
          requestLedger: function(ledger_index, callback) {
            callback(null, {
              "ledger": {
                "accepted": true,
                "account_hash": "14140639C82776D045EF962B6D14D5099A94067AE34DEA0E26D9D5C628697903",
                "close_time": 416445410,
                "close_time_human": "2013-Mar-12 23:16:50",
                "close_time_resolution": 10,
                "closed": true,
                "hash": "195F62F34EB2CCFA4C5888BA20387E82EB353DDB4508BAE6A835AF19FB8B0C09",
                "ledger_hash": "195F62F34EB2CCFA4C5888BA20387E82EB353DDB4508BAE6A835AF19FB8B0C09",
                "ledger_index": "348734",
                "parent_hash": "C9E7A882E7B506F13657B3BEB2E2F7236A13A848DDA134986A8672C0CF3C7ABB",
                "seqNum": "348734",
                "totalCoins": "99999999999691710",
                "total_coins": "99999999999691710",
                "transaction_hash": "F8CFE8553BA1688FD606F96414BB8C7858472A08C7BB021D718F5961BB284B59"
              }
            });
          }
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            callback();
          }
        }
      };
      var req = {
        params: {
          account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
          identifier: '389720F6FD8A144F171708F9ECB334D704CBCFEFBCDA152D931AC34FB5F9E32B'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(200);

          // List of keys taken from Payment schema
          expect(json_response.payment).to.have.keys([
            'source_account',
            'source_tag',
            'source_amount',
            'source_slippage',
            'destination_account',
            'destination_tag',
            'destination_amount',
            'invoice_id',
            'paths',
            'partial_payment',
            'no_direct_ripple',
            'direction',
            'state',
            'result',
            'ledger',
            'hash',
            'timestamp',
            'fee',
            'source_balance_changes',
            'destination_balance_changes'
          ]);
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

    // TODO: add more tests for this
    it('should parse the source_balance_changes and destination_balance_changes correctly', function(done){

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){},
          requestTx: function(hash, callback){
            callback(null, {
              "Account": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
              "Amount": {
                "currency": "USD",
                "issuer": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
                "value": "1"
              },
              "Destination": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
              "Fee": "10",
              "Flags": 0,
              "Paths": [
                [
                  {
                    "account": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "currency": "USD",
                    "issuer": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  }
                ],
                [
                  {
                    "account": "rD1jovjQeEpvaDwn9wKaYokkXXrqo4D23x",
                    "currency": "USD",
                    "issuer": "rD1jovjQeEpvaDwn9wKaYokkXXrqo4D23x",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  },
                  {
                    "account": "rB5TihdPbKgMrkFqrqUC3yLdE8hhv4BdeY",
                    "currency": "USD",
                    "issuer": "rB5TihdPbKgMrkFqrqUC3yLdE8hhv4BdeY",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  },
                  {
                    "account": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "currency": "USD",
                    "issuer": "r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV",
                    "type": 49,
                    "type_hex": "0000000000000031"
                  }
                ]
              ],
              "SendMax": {
                "currency": "USD",
                "issuer": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
                "value": "1.01"
              },
              "Sequence": 88,
              "SigningPubKey": "02EAE5DAB54DD8E1C49641D848D5B97D1B29149106174322EDF98A1B2CCE5D7F8E",
              "TransactionType": "Payment",
              "TxnSignature": "30440220791B6A3E036ECEFFE99E8D4957564E8C84D1548C8C3E80A87ED1AA646ECCFB16022037C5CAC97E34E3021EBB426479F2ACF3ACA75DB91DCC48D1BCFB4CF547CFEAA0",
              "hash": "E08D6E9754025BA2534A78707605E0601F03ACE063687A0CA1BDDACFCD1698C7",
              "inLedger": 348734,
              "ledger_index": 348734,
              "meta": {
                "AffectedNodes": [
                  {
                    "ModifiedNode": {
                      "FinalFields": {
                        "Account": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
                        "Balance": "59328999119",
                        "Flags": 0,
                        "OwnerCount": 11,
                        "Sequence": 89
                      },
                      "LedgerEntryType": "AccountRoot",
                      "LedgerIndex": "E0D7BDE68B468FF0B8D948FD865576517DA987569833A05374ADB9A72E870A06",
                      "PreviousFields": {
                        "Balance": "59328999129",
                        "Sequence": 88
                      },
                      "PreviousTxnID": "C26AA6B4F7C3B9F55E17CD0D11F12032A1C7AD2757229FFD277C9447A8815E6E",
                      "PreviousTxnLgrSeq": 348700
                    }
                  },
                  {
                    "ModifiedNode": {
                      "FinalFields": {
                        "Balance": {
                          "currency": "USD",
                          "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                          "value": "-1"
                        },
                        "Flags": 131072,
                        "HighLimit": {
                          "currency": "USD",
                          "issuer": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
                          "value": "100"
                        },
                        "HighNode": "0000000000000000",
                        "LowLimit": {
                          "currency": "USD",
                          "issuer": "r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH",
                          "value": "0"
                        },
                        "LowNode": "0000000000000000"
                      },
                      "LedgerEntryType": "RippleState",
                      "LedgerIndex": "EA4BF03B4700123CDFFB6EB09DC1D6E28D5CEB7F680FB00FC24BC1C3BB2DB959",
                      "PreviousFields": {
                        "Balance": {
                          "currency": "USD",
                          "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                          "value": "0"
                        }
                      },
                      "PreviousTxnID": "53354D84BAE8FDFC3F4DA879D984D24B929E7FEB9100D2AD9EFCD2E126BCCDC8",
                      "PreviousTxnLgrSeq": 343570
                    }
                  }
                ],
                "TransactionIndex": 0,
                "TransactionResult": "tesSUCCESS"
              },
              "validated": true
            });
          },
          requestLedger: function(ledger_index, callback) {
            callback(null, {
              "ledger": {
                "accepted": true,
                "account_hash": "14140639C82776D045EF962B6D14D5099A94067AE34DEA0E26D9D5C628697903",
                "close_time": 416445410,
                "close_time_human": "2013-Mar-12 23:16:50",
                "close_time_resolution": 10,
                "closed": true,
                "hash": "195F62F34EB2CCFA4C5888BA20387E82EB353DDB4508BAE6A835AF19FB8B0C09",
                "ledger_hash": "195F62F34EB2CCFA4C5888BA20387E82EB353DDB4508BAE6A835AF19FB8B0C09",
                "ledger_index": "348734",
                "parent_hash": "C9E7A882E7B506F13657B3BEB2E2F7236A13A848DDA134986A8672C0CF3C7ABB",
                "seqNum": "348734",
                "totalCoins": "99999999999691710",
                "total_coins": "99999999999691710",
                "transaction_hash": "F8CFE8553BA1688FD606F96414BB8C7858472A08C7BB021D718F5961BB284B59"
              }
            });
          }
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            callback();
          }
        }
      };
      var req = {
        params: {
          account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
          identifier: '389720F6FD8A144F171708F9ECB334D704CBCFEFBCDA152D931AC34FB5F9E32B'
        }
      };
      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(200);
          expect(json_response.payment.source_balance_changes).to.deep.equal([{
            value: '-0.00001',
            currency: 'XRP',
            issuer: ''
          }, {
            value: '-1',
            currency: 'USD',
            issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH'
          }]);
          expect(json_response.payment.destination_balance_changes).to.deep.equal([{
            value: '1',
            currency: 'USD',
            issuer: 'r3PDtZSa5LiYp1Ysn1vMuMzB59RzV3W9QH'
          }]);
          done();
        }
      };
      var next = function(err){};

      payments.get($, req, res, next);

    });

  });

  // describe('.getBulkPayments()', function(){

  //   it('should respond with an error if no account is specified', function(){

  //   });

  //   it('should respond with an error if there is no connection to rippled', function(){

  //   });

  //   it('should filter the results to include only payments', function(){

  //   });

  //   it('should produce an array of objects that have a "client_resource_id" field and a "payment" field', function(){

  //   });

  //   it('should filter the results based on source_account and destination_account, if specified', function(){

  //   });

  //   it('should filter the results based on the direction, if specified', function(){

  //   });

  //   it('should filter the results based on state (validated / failed), if specified', function(){

  //   });

  // });

  // describe('.getPathFind()', function(){

  //   it('should respond with an error if the source_account is missing', function(){

  //   });

  //   it('should respond with an error if the source_account is invalid', function(){

  //   });

  //   it('should respond with an error if the destination_account is missing', function(){

  //   });

  //   it('should respond with an error if the destination_account is invalid', function(){

  //   });

  //   it('should respond with an error if the destination_amount is missing', function(){

  //   });

  //   it('should respond with an error if the destination_amount is invalid', function(){

  //   });

  //   it('should respond with an error if the source_currencies list is invalid', function(){

  //   });

  //   it('should respond with an error if there is no connection to rippled', function(){

  //   });

  //   it('should convert the parameters into the form expected by ripple-lib', function(){

  //   });

  //   it('should add a direct XRP path where applicable (because rippled assumes the direct path is obvious)', function(){

  //   });

  //   it('should respond with an error if the destination_account does not accept the specified currency', function(){

  //   });

  //   it('shoudld respond with an error if there is no path found because of insufficient liquidity', function(){

  //   });

  //   it('should produce an array of properly formatted payment objects', function(){

  //   });

  // });

});
