let mqtt = require('mqtt')
let client  = mqtt.connect('mqtt://test.mosquitto.org')

client.on('connect', () => {
  console.log('Connected')
  client.subscribe('presence', (err) => {
    console.log('Subscribed to "presence" topic')
  })
})

client.on('message', (topic, message) => {
  // message is Buffer
  console.log('message published to the "presence" topic')
  console.log(message.toString())
  client.end()
})
