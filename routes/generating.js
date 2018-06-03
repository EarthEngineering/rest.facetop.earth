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
  res.json({ status: 'generating' });
});

router.post('/generateToAddress/:nblocks/:address', (req, res, next) => {
  let maxtries = 1000000;
  if(req.query.maxtries) {
    maxtries = parseInt(req.query.maxtries);
  }

  BitboxHTTP({
    method: 'post',
    auth: {
      username: username,
      password: password
    },
    data: {
      jsonrpc: "1.0",
      id:"generatetoaddress",
      method: "generatetoaddress",
      params: [
        req.params.nblocks,
        req.params.address,
        maxtries
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
