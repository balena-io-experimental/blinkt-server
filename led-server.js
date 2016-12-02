const express = require('express');
const exec = require('child_process').exec;
const bodyParser = require('body-parser');
const Blinkt = require('node-blinkt')

// Blinkt API.
const app = express();
const blinkt = new Blinkt();

let LEDs = [];
let runPreset = false;
let currentPreset = 0;
const presets = [
    {
        name: 'cylon',
        timer: null,
        method: () => {
            const scaler = 1 / 8;
            const pauseLength = 5;
            let currentIndex = 1;
            let direction = 1;
            let pauseCount = 0;
            let cylonList = [1, 0, 0, 0, 0, 0, 0, 0];

            for (let index = 0; index < 8; index += 1) {
                blinkt.setPixel(index, 255, 0, 0, 0);
                cylonList.push(1 - ((1 / 8) * index));
            }

            const updateCylon = () => {
                // Reduce the amount in each index by the scalar, except
                // for the currentLED, which should be set to 1.
                for (let index = 0; index < 8; index += 1) {
                    if (currentIndex === index) {
                        cylonList[index] = 1;
                    } else {
                        if (cylonList[index] > 0) {
                            cylonList[index] -= scaler;
                        }
                    }
                    blinkt.setBrightness(index, cylonList[index]);
                }
                blinkt.sendUpdate();

                if (pauseCount > 0) {
                    pauseCount -= 1;
                } else {
                    currentIndex += direction;
                }

                if (currentIndex > 7) {
                    direction = -1;
                    currentIndex = 7;
                    pauseCount = 5;
                } else if (currentIndex < 0) {
                    direction = 1;
                    currentIndex = 0;
                    pauseCount = 5;
                }

                if (runPreset) {
                    presets[currentPreset].timer = setTimeout(() => {
                        updateCylon();
                    }, 100);
                }
            };
            updateCylon();
        },
    },
    {
        name: 'memory',
        timer: null,
        method: () => {
            // Get the amount of memory we have and how much is free
            exec('cat /proc/meminfo', function (err, out) {
                if (!err) {
                    let matchTotal = out.match(/MemTotal:\s+([0-9]+)/);
                    let matchFree = out.match(/MemAvailable:\s+([0-9]+)/);
                    const total = parseInt(matchTotal[1], 10);
                    const free = parseInt(matchFree[1], 10);;
                    const numFreeLEDs = Math.floor((free / total * 8));

                    for (let index = 0; index < numFreeLEDs; index += 1) {
                        blinkt.setPixel(index, 0, 255, 0, 255);
                    }
                    for (let index = numFreeLEDs; index < 8; index += 1) {
                        blinkt.setPixel(index, 255, 0, 0, 255);
                    }
                    blinkt.sendUpdate();
                }
                if (runPreset) {
                    presets[currentPreset].timer = setTimeout(() => {
                        presets[currentPreset].method();
                    }, 1000);
                }
            });
        }
    }
];

function setLEDs () {
    for (let index = 0; index < 8; index += 1) {
        if (LEDs[index]) {
            blinkt.setBrightness(index, 1.0);
        } else {
            blinkt.setBrightness(index, 0.0);
        }
        blinkt.sendUpdate();
    }
}

// Setup blinkt
blinkt.setup();
for (let index = 0; index < 8; index += 1) {
    LEDs.push(false);
}
setLEDs();

// Initialise Express
app.use(express.static(__dirname + '/public'));
app.use('/public/js', express.static(__dirname + '/public/js'));
app.use('/node_modules',  express.static(__dirname + '/node_modules'));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// Set up routes.
app.get('/', function (req, res) {
    res.sendFile('./public/index.html');
});
app.get('/leds', function (req, res) {
    // Send back the current LED status.
    let results = [];
    for (let led = 0; led < 8; led += 1) {
        results.push({ id: led, value: LEDs[led] });
    }
    res.send(results);
});
app.post('/leds/:id', function (req, res) {
    const params = req.params;

    // Stop any presets.
    if (runPreset) {
        runPreset = false;
        clearTimeout(presets[currentPreset].timer);
        blinkt.clearAll();
    }

    // Update LEDs
    LEDs[req.params.id] = !LEDs[req.params.id];
    setLEDs();

    res.sendStatus(200);
});
app.get('/presets', function (req, res) {
    // Inefficient as it sends the method back, but anyway...
    res.send(presets);
});
app.post('/presets/:name', function (req, res) {
    const name = req.params.name;

    // Stop any presets.
    runPreset = false;
    clearTimeout(presets[currentPreset].timer);

    // If the name exists, start the appropriate preset running.
    for (let index = 0; index < presets.length; index += 1) {
        if (name === presets[index].name) {
            runPreset = true;
            currentPreset = index;
            presets[index].method();
            break;
        }
    }
    res.sendStatus(200);
});

// Start server on port 80
const server = app.listen(80, function () {

    var port = server.address().port;
    console.log('LED server listening');
});

