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
        json: function(status_code, json_response) {
          expect(status_code).to.equal(500);
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
        json: function(status_code, json_response) {
          expect(status_code).to.equal(500);
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
        json: function(status_code, json_response) {
          expect(status_code).to.equal(500);
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

    //   // Add account to initialize TransactionManager
    //   var transaction_manager = remote.account(test_transaction.tx_json.Account)._transactionManager;

    //   // Mock the _request function so it goes through the normal transaction states
    //   var states = ['submitted', 'pending', 'validated'];
    //   transaction_manager._request = function() {

    //     console.log('_request called');
    //     var self = this;

    //       self.emit('save');
    //       states.forEach(function(state){
    //         self.setState(state);
    //       });
    //   };

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

    it('should call the callback with the client_resource_id when the "proposed" event is emitted', function(done){

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
      }, function(err, client_resource_id){
        expect(err).not.to.exist;
        expect(client_resource_id).to.equal(client_resource_id);
        done();
      });

    });

    // it('should save errors that happen after the "proposed" event to the database but not report them to the client', function(){


    // });

  });

  // Note that internally .get() is .getTransaction
  describe('.get()', function(){

    // it('should call getTransactionHelper and respond directly to the client with the transaction', function(done){

    //   var normal_getTransactionHelper = transactions.getTransactionHelper;
    //   transactions.getTransactionHelper = function($, req, res, callback) {
    //     callback(null, {
    //       success: true, 
    //       transaction: 'This should be a Transaction'
    //     });
    //   };

    //   transactions.get({}, {}, {
    //     json: function(status_code, json_response){
    //       expect(status_code).to.equal(200);
    //       expect(json_response.success).to.be.true;
    //       expect(json_response.transaction).to.equal('This should be a Transaction');
    //       done();
    //     }
    //   });

    //   transactions.getTransactionHelper = normal_getTransactionHelper;

    // });

    // it('should pass errors to the Express.js next() function', function(){

    //   var normal_getTransactionHelper = transactions.getTransactionHelper;
    //   transactions.getTransactionHelper = function($, req, res, callback) {
    //     callback(new Error('Some error'));
    //   };

    //   transactions.get({}, {}, {}, function(err){
    //     expect(err.message).to.equal('Some error');
    //     done();
    //   });

    //   transactions.getTransactionHelper = normal_getTransactionHelper;

    // });

  });

  describe('.getTransactionHelper()', function(){

    it('should respond with an error if the identifier is neither a hash nor a valid client_resource_id', function(done){

      var $ = {
        remote: {

        },
        dbinterface: {

        }
      };

      var req = {
        params: {
          account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
          identifier: 'Invalid\n Identifier'
        }
      };

      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.message).to.equal('Parameter not a valid transaction hash or client_resource_id: identifier');
          done();
        }
      };

      var callback = function(err, res){

      };

      transactions.getTransactionHelper($, req, res, callback);

    });

    it('should respond with an error if there is no connection to rippled', function(done){

      var normal_CONNECTION_TIMEOUT = server_lib.CONNECTION_TIMEOUT;
      server_lib.CONNECTION_TIMEOUT = 0;

      var $ = {
        remote: {
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now() - (1000 * 20 + 1)
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {

        }
      };

      var req = {
        params: {
          account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
          identifier: 'Valid Identifier'
        }
      };

      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(500);
          expect(json_response.message).to.contain('Cannot connect to rippled');
          done();
        }
      };

      var callback = function(err, res){

      };

      transactions.getTransactionHelper($, req, res, callback);

      server_lib.CONNECTION_TIMEOUT = normal_CONNECTION_TIMEOUT;

    });

    it('should query the remote if no record is found in the database', function(done){

      var normal_CONNECTION_TIMEOUT = server_lib.CONNECTION_TIMEOUT;
      server_lib.CONNECTION_TIMEOUT = 0;

      var tx_hash = '1C3FFA4EDD96193BE0DF65E0C2D8692803538DEF761E721B571812B7B527D702';

      var $ = {
        remote: {
          requestTx: function(hash, callback){
            if (hash === tx_hash) {
              done();
            }
          },
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now()
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {
          getTransaction: function(opts, callback) {
            callback();
          }
        }
      };

      var req = {
        params: {
          account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
          identifier: tx_hash
        }
      };

      var res = {
        json: function(status_code, json_response) {

        }
      };

      var callback = function(err, res){

      };

      transactions.getTransactionHelper($, req, res, callback);

      server_lib.CONNECTION_TIMEOUT = normal_CONNECTION_TIMEOUT;

    });

    it('should query the remote if only the record in the client_resource_id_records is found', function(done){

      var normal_CONNECTION_TIMEOUT = server_lib.CONNECTION_TIMEOUT;
      server_lib.CONNECTION_TIMEOUT = 0;

      var tx_hash = '1C3FFA4EDD96193BE0DF65E0C2D8692803538DEF761E721B571812B7B527D702';

      var $ = {
        remote: {
          requestTx: function(hash, callback){
            if (hash === tx_hash) {
              done();
            }
          },
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now()
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {
          getTransaction: function(opts, callback) {
            if (opts.hash === tx_hash) {
              callback(null, {
                source_account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
                type: 'payment',
                client_resource_id: 'someid',
                hash: tx_hash,
                ledger: '1000000',
                state: 'validated',
                result: 'tesSUCCESS'
              });
            }
          }
        }
      };

      var req = {
        params: {
          account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
          identifier: tx_hash
        }
      };

      var res = {
        json: function(status_code, json_response) {
          expect(status_code).not.to.exist;
        }
      };

      var callback = function(err, res){
        expect(err).not.to.exist;
      };

      transactions.getTransactionHelper($, req, res, callback);

      server_lib.CONNECTION_TIMEOUT = normal_CONNECTION_TIMEOUT;

    });

    it('should respond with an error if the account is specified but the transaction did not affect the given account', function(done){

      var normal_CONNECTION_TIMEOUT = server_lib.CONNECTION_TIMEOUT;
      server_lib.CONNECTION_TIMEOUT = 0;

      var tx_hash = '1C3FFA4EDD96193BE0DF65E0C2D8692803538DEF761E721B571812B7B527D702';

      var $ = {
        remote: {
          requestTx: function(hash, callback){
            if (hash === tx_hash) {
              callback(null, {
                Account : "rKXCummUHnenhYudNb9UoJ4mGBR75vFcgz",
                Amount : "1000000",
                Destination : "razqQKzJRdB4UxFPWf5NEpEG3WMkmwgcXA",
                Fee : "12",
                Flags : 2147483648,
                LastLedgerSequence : 6487173,
                Sequence : 269,
                SigningPubKey : "02FA03AED689EF4D9EFA21CA40F7CD8C84D5386AAE2924ED65688841336D366BB6",
                TransactionType : "Payment",
                TxnSignature : "304402200BFFC043A170F37F95F7921AA8A9C06F0D6D78E45AFC3380F154AA33858D9A410220557D3617006FEE7A32C8534632FED9AE8ECAD4FD20D206DA23D6DCE005EE6AD5",
                date : 452727320,
                hash : "9C29E7850FC2F5DFCE938F5F2F94969C6A899C03CADDF1423E790EA98F7FA2EA",
                inLedger : 6487166,
                ledger_index : 6487166
              });
            }
          },
          _getServer: function() {
            return {
              _lastLedgerClose: Date.now()
            };
          },
          once: function(){},
          on: function(){},
          connect: function(){},
          removeListener: function(){}
        },
        dbinterface: {
          getTransaction: function(opts, callback) {
            callback();
          }
        }
      };

      var req = {
        params: {
          account: 'rLpq5RcRzA8FU1yUqEPW4xfsdwon7casuM',
          identifier: tx_hash
        }
      };

      var res = {
        json: function(status_code, json_response) {
          expect(status_code).to.equal(400);
          expect(json_response.message).to.equal('Transaction specified did not affect the given account');
          done();
        }
      };

      var callback = function(err, res){

      };

      transactions.getTransactionHelper($, req, res, callback);

      server_lib.CONNECTION_TIMEOUT = normal_CONNECTION_TIMEOUT;

    });

    // it('should query the remote to attach the date to the transaction', function(){

    // });

    // it('should call the callback with the transaction in JSON format', function(){

    // });

  });

  describe('.getAccountTransactions()', function(){



  });

});
