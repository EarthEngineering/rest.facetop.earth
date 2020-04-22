let mqtt = require('mqtt')
let client  = mqtt.connect('mqtt://test.mosquitto.org')

client.publish('presence', 'Hello mqtt')
