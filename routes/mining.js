let express = require('express');
let router = express.Router();
let axios = require('axios');

let BITBOXCli = require('bitbox-cli/lib/bitbox-cli').default;
let BITBOX = new BITBOXCli();

let BitboxHTTP = axios.create({
  baseURL: `http://167.99.110.201:18332/`
});
let username = 'bitcoin';
let password = 'rD9yw2Y9RkOnYjYnDX';

router.get('/', (req, res, next) => {
  res.json({ status: 'mining' });
});

router.get('/getBlockTemplate/:templateRequest', (req, res, next) => {
  BitboxHTTP({
    method: 'post',
    auth: {
      username: username,
      password: password
    },
    data: {
      jsonrpc: "1.0",
      id:"getblocktemplate",
      method: "getblocktemplate",
      params: [
        req.params.templateRequest
      ]
    }
  })
  .then((response) => {
    res.send(response.data.result);
  })
  .catch((error) => {
    res.send(error.response.data.error.message);
  });
});

router.get('/getMiningInfo', (req, res, next) => {
  BitboxHTTP({
    method: 'post',
    auth: {
      username: username,
      password: password
    },
    data: {
      jsonrpc: "1.0",
      id:"getmininginfo",
      method: "getmininginfo"
    }
  })
  .then((response) => {
    res.json(response.data.result);
  })
  .catch((error) => {
    res.send(error.response.data.error.message);
  });
});

router.get('/getNetworkHashps', (req, res, next) => {
  BitboxHTTP({
    method: 'post',
    auth: {
      username: username,
      password: password
    },
    data: {
      jsonrpc: "1.0",
      id:"getnetworkhashps",
      method: "getnetworkhashps"
    }
  })
  .then((response) => {
    res.json(response.data.result);
  })
  .catch((error) => {
    res.send(error.response.data.error.message);
  });
});

router.post('/submitBlock/:hex', (req, res, next) => {
  let parameters = '';
  if(req.query.parameters && req.query.parameters !== '') {
    parameters = true;
  }

  BitboxHTTP({
    method: 'post',
    auth: {
      username: username,
      password: password
    },
    data: {
      jsonrpc: "1.0",
      id:"submitblock",
      method: "submitblock",
      params: [
        req.params.hex,
        parameters
      ]
    }
  })
  .then((response) => {
    res.send(response.data.result);
  })
  .catch((error) => {
    res.send(error.response.data.error.message);
  });
});

module.exports = router;
