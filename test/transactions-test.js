var expect       = require('chai').expect;
var transactions = require('../api/transactions');
var server_lib   = require('../lib/server-lib');
var ripple       = require('ripple-lib');

server_lib.CONNECTION_TIMEOUT = 1;

describe('api/transactions', function(){

  describe('.submit()', function(){

    it('should respond with an error if the remote is disconnected', function(done){

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() - 20001 // Considered disconnected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {}
      };

      transactions.submit($, {}, {
        json: function(error_code, json_response) {
          expect(error_code).to.equal(500);
          expect(json_response.message).to.contain('Cannot connect to rippled');
          done();
        }
      }, function(err, res){});

    });

    it('should block duplicate Payments (same account same client_resource_id)', function(done){

      var test_transaction = new ripple.Transaction(),
        client_resource_id = 'ebb9d857-fc71-440f-8b0a-f1ea3535986a';
      test_transaction.payment({
        from: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        to: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        amount: '10XRP'
      });

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() - 1 // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            if (params.source_account === 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM' &&
              params.client_resource_id === client_resource_id &&
              params.type === 'payment') {

              callback(null, {
                source_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
                type: 'payment',
                client_resource_id: client_resource_id,
                hash: '108847C3EFA523EE412DDDA1C319B7AA80F257708DF1EC6F02E52BE93FF59051',
                ledger: '6098806',
                state: 'validated',
                result: 'tesSUCCESS'
              });
            } else {
              callback(new Error('Cannot get record'));
            }
          }
        }
      };

      transactions.submit($, {
        account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        transaction: test_transaction,
        client_resource_id: client_resource_id
      }, {
        json: function(error_code, json_response) {
          expect(error_code).to.equal(500);
          expect(json_response.message).to.contain('Duplicate Transaction');
          done();
        }
      }, function(err, res){
        expect(err).not.to.exist;
      });

    });

    it('should block duplicate OfferCreates and OfferCancels', function(done){

      var test_transaction = new ripple.Transaction(),
        client_resource_id = 'a107e1e3-b552-41a5-8452-c8a413cdb7c2';
      test_transaction.offerCreate({
        account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        taker_pays: '10000',
        taker_gets: {
          value: '10',
          currency: 'USD',
          issuer: 'rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz'
        }
      });

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() - 1 // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            if (params.source_account === 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM' &&
              params.client_resource_id === client_resource_id &&
              params.type === 'offercreate') {

              callback(null, {
                source_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
                type: 'offercreate',
                client_resource_id: client_resource_id,
                hash: '208847C3EFA523EE412DDDA1C319B7AA80F257708DF1EC6F02E52BE93FF59051',
                ledger: '6098807',
                state: 'validated',
                result: 'tesSUCCESS'
              });
            } else {
              callback(new Error('Cannot get record'));
            }
          }
        }
      };

      transactions.submit($, {
        account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        transaction: test_transaction,
        client_resource_id: client_resource_id
      }, {
        json: function(error_code, json_response) {
          expect(error_code).to.equal(500);
          expect(json_response.message).to.contain('Duplicate Transaction');
          done();
        }
      }, function(err, res){
        expect(err).not.to.exist;
      });

    });

    it('should call the callback if there is an error before the "proposed" event is emitted', function(done){

      var test_transaction = new ripple.Transaction(),
        client_resource_id = 'ebb9d857-fc71-440f-8b0a-f1ea3535986a';
      test_transaction.payment({
        from: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        to: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        amount: '10XRP'
      });

      test_transaction.submit = function() {
        this.emit('error', 'Some Error');
      };

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() - 1 // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            callback();
          }
        }
      };

      transactions.submit($, {
        account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        transaction: test_transaction,
        client_resource_id: client_resource_id
      }, {
        json: function() {}
      }, function(err, res){
        expect(err).to.exist;
        expect(err).to.equal('Some Error');
        done();
      });

    });

    // it('should save the transaction to the database every time the transaction state is changed', function(done){

    //   var test_transaction = new ripple.Transaction(),
    //     client_resource_id = 'ebb9d857-fc71-440f-8b0a-f1ea3535986a';
    //   test_transaction.payment({
    //     from: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
    //     to: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
    //     amount: '10XRP'
    //   });
    //   test_transaction.tx_json.Sequence = 10;

    //   var states = ['submitted', 'pending', 'validated'];

    //   // Mock the submit function with one that goes through the normal states
    //   // a transaction goes through after submission
    //   test_transaction.submit = function(callback) {
    //     var self = this;

    //     self.remote.account(self.tx_json.Account).submit(self);

    //     process.nextTick(function() {
    //       remote.account(self.tx_json.Account)._transactionManager.emit('sequence_loaded');
    //       // Save is also emitted when the transaction is signed
    //       self.emit('save');
    //       states.forEach(function(state){
    //         self.setState(state);
    //       });
    //     });

    //   };

    //   test_transaction.on('save', function(){
    //     console.log('save emitted');
    //   });

    //   // Count the number of times saveTransaction is called and
    //   // call done when it has been called once per state change
    //   var times_called = 0;
    //   function saveTransaction(transaction_data, callback) {
    //     console.log(transaction_data.transaction.state);
    //     if (transaction_data.transaction.state === states[times_called]) {
    //       times_called++;
    //     }

    //     if (times_called === states.length + 1) {
    //       done();
    //     }
    //   }

    //  var dbinterface = {
    //     getTransaction: function(params, callback) {
    //       callback();
    //     },
    //     saveTransaction: saveTransaction
    //   };

    //   var remote = new ripple.Remote({
    //     servers: [],
    //     storage: dbinterface
    //   });
    //   remote._getServer = function() {
    //     return {
    //       _lastLedgerClose: Date.now() - 1 // Considered connected
    //     };
    //   };
    //   remote.connect = function(){};

    //   test_transaction.remote = remote;

    //   transactions.submit({
    //     remote: remote,
    //     dbinterface: dbinterface
    //   }, {
    //     account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
    //     transaction: test_transaction,
    //     client_resource_id: client_resource_id
    //   }, {
    //     json: function() {}
    //   }, function(err, res){
    //     if (err) {
    //       console.log(err, err.stack);
    //     }
    //   });

    // });

    it('should call the callback with the client_resource_id when the "proposed" event is emitted', function(){

      var test_transaction = new ripple.Transaction(),
        client_resource_id = 'ebb9d857-fc71-440f-8b0a-f1ea3535986a';
      test_transaction.payment({
        from: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        to: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        amount: '10XRP'
      });

      test_transaction.submit = function() {
        this.emit('proposed');
      };

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() - 1 // Considered connected
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {
          getTransaction: function(params, callback) {
            callback();
          }
        }
      };

      transactions.submit($, {
        account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
        transaction: test_transaction,
        client_resource_id: client_resource_id
      }, {
        json: function() {}
      }, function(err, res){
        expect(err).not.to.exist;
        expect(res.client_resource_id).to.equal(client_resource_id);
        done();
      });

    });

    // it('should save errors that happen after the "proposed" event to the database but not report them to the client', function(){

    // });

  });

});
