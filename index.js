// JSONファイルの読み込み（ローカル用）/////////////////////////////////
var fs = require('fs');
var setting = {};

var IFTTT_EVENT_NAME = "";
var IFTTT_SECURITY_KEY = "";
if( process.env.PORT ) {
  // Heroku上では環境変数から読み込む（インストール時に設定）
  IFTTT_EVENT_NAME = process.env.IFTTT_EVENT_NAME;
  IFTTT_SECURITY_KEY = process.env.IFTTT_SECURITY_KEY;
} else {
  // .envフォルダはあらかじめ .gitignore 対象にしておく。
  setting = JSON.parse(fs.readFileSync('.env/setting.json', 'utf8'));
  //
  IFTTT_EVENT_NAME = setting.IFTTT_EVENT_NAME;
  IFTTT_SECURITY_KEY = setting.IFTTT_SECURITY_KEY;
}

console.log("IFTTT_EVENT_NAME:" + IFTTT_EVENT_NAME);
console.log("IFTTT_SECURITY_KEY:" + IFTTT_SECURITY_KEY);

////////////////////////////////////////////////////////////////////////

var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.send('Hello World!');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

var mqtt = require('mqtt'), url = require('url');
// Parse
var mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://localhost:1883');
var auth = (mqtt_url.auth || ':').split(':');

// Create a client connection
var client = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
  username: auth[0],
  password: auth[1]
});

client.subscribe('sendHeroku');
client.on('message', function(topic, message, packet) {
  console.log("Received '" + message + "' on '" + topic + "'");

  if(topic == 'sendHeroku'){
    var data = JSON.parse(message.toString());
    console.log(data);
    // 実際の送信する sendIFTTT
    sendIFTTT(
        data.value1,
        data.value2,
        data.value3
    );
  }
});

client.on('connect', function() { // When connected
  // publish a message to a topic
  client.publish('status/connect', 'device', function() {
    console.log("Message is published");
  });
})

// IFTTTから送信されてきた情報をWEBに通知する
app.post('/ifttt/receive', function(request, response) {
  response.set('Content-Type', 'application/json');
  console.log('---------- input[/ifttt/receive]');
  console.log(request.body);
  response.send("{'request':'/ifttt/receive'}");
  client.publish('receiveHeroku', JSON.stringify(request.body) , function() {
    console.log("Message is published(receiveHeroku)");
  });
});

// 実際の送信する sendIFTTT
function sendIFTTT(value1,value2,value3) {
    var _request = require('request');
    var options = {
        uri: 'http://maker.ifttt.com/trigger/' + IFTTT_EVENT_NAME + '/with/key/' + IFTTT_SECURITY_KEY,
        form: {
            value1: value1,
            value2: value2,
            value3: value3
        },
        json: true
    };

    console.log('---------- [' + IFTTT_EVENT_NAME + ']');
    console.log(options);

    _request.post(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        } else {
            console.log('error: ' + response.statusCode);
        }
    });

}