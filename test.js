var s3Storage = require('./s3storage');

var settings = {
    awsS3Bucket: 'wsuite-alb',
    awsRegion: 'us-east-1',
    brand_id: '51113'
}

var flowJson = [{"id":"d71e62d7.6fc07","type":"tab","label":"52137-flow","disabled":false,"info":""},{"id":"404ce81e.41ec18","type":"tab","label":"51266-flow","disabled":false,"info":""},{"id":"f388f0e7.2e7c2","type":"http in","z":"d71e62d7.6fc07","name":"","url":"/hello","method":"get","upload":false,"swaggerDoc":"","x":490,"y":380,"wires":[["6afb752e.7d120c"]]},{"id":"f87fd0f.807923","type":"http response","z":"d71e62d7.6fc07","name":"","statusCode":"","headers":{},"x":820,"y":380,"wires":[]},{"id":"6afb752e.7d120c","type":"template","z":"d71e62d7.6fc07","name":"form1","field":"payload","fieldType":"msg","format":"handlebars","syntax":"mustache","template":"<form method=\"POST\">\n    Input your name<input type=\"text\" name=\"key1\">\n    <input type=\"submit\">\n</form>","output":"str","x":660,"y":380,"wires":[["f87fd0f.807923"]]},{"id":"af7db394.52947","type":"http in","z":"d71e62d7.6fc07","name":"","url":"/hello","method":"post","upload":false,"swaggerDoc":"","x":490,"y":460,"wires":[["115389aa.990866"]]},{"id":"115389aa.990866","type":"template","z":"d71e62d7.6fc07","name":"view","field":"payload","fieldType":"msg","format":"handlebars","syntax":"plain","template":"<h1>Hello Chintan</h1>","output":"str","x":660,"y":460,"wires":[["f87fd0f.807923"]]},{"id":"88ca2e35.b2c85","type":"inject","z":"404ce81e.41ec18","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":460,"y":420,"wires":[["dbc732cb.a4bbb"]]},{"id":"dbc732cb.a4bbb","type":"debug","z":"404ce81e.41ec18","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":680,"y":420,"wires":[]}]

s3Storage.init(settings);
console.log(s3Storage.saveData('flow', flowJson));