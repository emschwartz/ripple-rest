var async                       = require('async');
var domain                      = require('domain');
var ripple                      = require('ripple-lib');
var paymentformatter            = require('./formatters/payment-formatter');
var serverlib                   = require('./server-lib');
var validator                   = require('./schema-validator');

var last_ledger_sequence_buffer = 6;


function submitPayment(remote, dbinterface, data, callback) {
  if (!data.payment) {
    callback(new Error('Missing parameter: payment. Submission must have payment object in JSON form'));
    return;
  }

  if (!data.secret) {
    callback(new Error('Missing parameter: secret. Submission must have account secret to sign and submit payment'));
    return;
  }

  if (!data.client_resource_id) {
    callback(new Error('Missing parameter: client_resource_id. All payments must be submitted with a client_resource_id to prevent duplicate payments'));
    return;
  }

  if (validator.validate(data.client_resource_id, 'ResourceId').length > 0) {
    callback(new Error('Invalid parameter: client_resource_id. Must be a string of ASCII-printable characters. Note that 256-bit hex strings are disallowed because of the potential confusion with transaction hashes.'));
    return;
  }

  var steps = [

    function(async_callback) {
      serverlib.ensureConnected(remote, async_callback);
    },

    function(connected, async_callback) {
      paymentformatter.paymentToTransaction(data.payment, async_callback);
    },

    function(transaction, async_callback) {
      data.transaction = transaction;
      submitRippleLibTransaction(remote, dbinterface, data, async_callback);
    }

  ];

  async.waterfall(steps, callback);

}

function submitRippleLibTransaction(remote, dbinterface, data, callback) {

  var steps = [

    function(async_callback) {
      // Secret is stored in transaction object, not in ripple-lib Remote
      // Note that transactions submitted with incorrect secrets will be passed
      // to rippled, which will respond with a 'temBAD_AUTH_MASTER' error
      // TODO: locally verify that the secret corresponds to the given account
      data.transaction.secret(data.secret);
      data.transaction.clientID(data.client_resource_id);

      async_callback(null, data.transaction);
    },

    // Block duplicate payments
    function(transaction, async_callback) {

      if (transaction.tx_json.TransactionType !== 'Payment') {
        async_callback(null, transaction);
        return;
      }
      
      dbinterface.getTransaction({
        source_account: transaction.tx_json.Account,
        client_resource_id: data.client_resource_id,
        type: 'payment'
      }, function(err, db_record){
        if (err) {
          async_callback(err);
          return;
        }

        if (db_record && db_record.state !== 'failed') {
          async_callback(new Error('Duplicate Payment. A record already exists in the database for a payment from this account with the same client_resource_id. Payments must be submitted with distince client_resource_id\'s to prevent accidental double-spending'));
        } else {
          async_callback(null, transaction);
        }

      });
    },

    function(transaction, async_callback) {
      transaction.remote = remote;
      transaction.lastLedger(parseInt(remote._ledger_current_index, 10) + last_ledger_sequence_buffer);
      async_callback(null, transaction);
    },

    function(transaction, async_callback) {

      // node.js domain is used to catch errors thrown during the submission process
      var submission_domain = domain.create();

      transaction.on('error', async_callback);
      submission_domain.on('error', async_callback);

      // The 'proposed' event is fired when ripple-lib receives an initial tesSUCCESS response from
      // rippled. This does not guarantee that the transaction will be validated but it is at this
      // point that we want to respond to the user that the transaction has been submitted
      transaction.once('proposed', function(){
        transaction.removeListener('error', async_callback);
        submission_domain.removeListener('error', async_callback);

        async_callback(null, transaction._clientID);
      });

      // The ripple-lib transaction submission is run in the context of the node.js domain
      // so that any errors thrown during the submission process will be picked up by that error handler.
      // Note that ripple-lib saves the transaction to the db throughout the submission process
      // using the persistence functions passed to the ripple-lib Remote instance
      submission_domain.run(function(){
        transaction.submit();
      });

      // transaction.on('success', function(result){
      //   console.log('Transaction validated');
      // });
    }

  ];

  async.waterfall(steps, callback);

}

module.exports.submitPayment = submitPayment;
