import * as crco from 'crco-utils';
import * as d3 from 'd3-ease';
import * as dat from 'dat.gui';
import { Analyser } from './analyser';
import { cContext, drawFreqLines, drawFreqBuckets, drawXAxis, drawAnalyserBounds, drawEasing, clear } from './drawing';
import { morningsAudioFiles } from './configs/audioFiles';

const AUDIO_PATH = 'audio/mornings/';
const GUI = new dat.GUI();
const startButton = document.getElementById('start-button');
const aContext = new AudioContext();

let audioState = 'stopped';
let buffer;
let player;
let analysers = {};

const audioParams = {
    file: "melody-two[8].mp3"
}

const globalParams = {
    power: 6,
    minFrequency: 20,
    maxFrequency: 16500,
    minDecibels: -120,
    maxDecibels: -40,
    showBuckets: false,
    numBuckets: 5,
}

const stagingParams = {
    compareMode: false,
    xEasingFunction: 'none',
    yEasingFunction: 'none',
    smoothingTimeConstant: .8,
    xExponent: 3,
    yExponent: 3,
}

const easings = ['none', 'polyIn', 'polyOut', 'polyInOut'];

const init = () => {
    return new Promise((resolve, reject) => {
        crco.createAudioPlayer(aContext, AUDIO_PATH + audioParams.file).then((p) => {
            console.log('p', p);
            startButton.disabled = false;
            buffer = p.buffer
            player = p;
            player.loop = true;
            player.connect(aContext.destination);
            aContext.suspend();
            addAnalyserToPage("standard", {
                id: 'standard',
                ...globalParams,
            });
            addAnalyserToPage("staging", {
                id: 'staging',
                ...globalParams,
                ...stagingParams,
                xEasing: getEasingFunction(stagingParams.xEasingFunction, { exponent: stagingParams.xExponent }),
                yEasing: getEasingFunction(stagingParams.yEasingFunction, { exponent: stagingParams.yExponent }),
            });
            resolve();
        }).catch(err => reject(err));
    });
}

const resetAudio = () => {

    console.log(player);

    player.stop();

    init().then(() => {
        aContext.resume();
        analysers.standard.reconnect(player);
        analysers.staging.reconnect(player);
        player.connect(aContext.destination);
        player.start();
    });


}

const initGui = () => {

    const audio = GUI.addFolder('audio');
    audio.add(audioParams, 'file').options(morningsAudioFiles.sort()).onChange(resetAudio);

    const globals = GUI.addFolder('globals');
    globals.add(globalParams, 'power', 5, 15, 1);
    globals.add(globalParams, 'minFrequency', 0, 18500, 5);
    globals.add(globalParams, 'maxFrequency', 300, 22500, 5);
    globals.add(globalParams, 'minDecibels', -200, -20, 1);
    globals.add(globalParams, 'maxDecibels', -120, 0, 1);
    globals.add(globalParams, 'showBuckets');
    globals.add(globalParams, 'numBuckets', 1, 50, 1);
    globals.__controllers.forEach((c) => c.onChange(() => updateAnalysers(['standard', 'staging'])));

    const staging = GUI.addFolder('staging');
    staging.add(stagingParams, 'compareMode');
    staging.add(stagingParams, 'smoothingTimeConstant', 0, 1, .01);
    staging.add(stagingParams, 'xEasingFunction').options(easings)
    staging.add(stagingParams, 'xExponent', .1, 10, .1);
    staging.add(stagingParams, 'yEasingFunction').options(easings);
    staging.add(stagingParams, 'yExponent', .1, 10, .1);

    staging.__controllers.forEach((c) => c.onChange(() => updateAnalysers(['staging'])));

}

const addListeners = () => {

    startButton.addEventListener('click', toggleAudio);
    window.addEventListener('keydown', (e) => {
        if (e.keyCode === 13) {
            toggleAudio();
        }
    });

}

const toggleAudio = () => {

    // resume on first user gesture
    if (aContext.state === 'suspended') {
        aContext.resume();
    }

    if (audioState === 'stopped') {
        // can only start a buffer source once / create a new one to start it again
        try { player.start() }
        catch (e) {
            player = aContext.createBufferSource();
            player.buffer = buffer;
            player.loop = true;
            player.connect(aContext.destination);
            analysers.standard.reconnect(player);
            analysers.staging.reconnect(player);
            player.start();
        }
        startButton.innerText = 'Stop Audio';
        audioState = 'started';
    }

    else if (audioState === 'started') {
        player.stop();
        startButton.innerText = 'Start Audio'
        audioState = 'stopped';
    }

}

const getEasingFunction = (name, params) => {
    switch (name) {
        case 'none': return (n) => n;
        case 'polyIn': return d3.easePolyIn.exponent(params ? params.exponent : null);
        case 'polyOut': return d3.easePolyOut.exponent(params ? params.exponent : null);
        case 'polyInOut': return d3.easePolyInOut.exponent(params ? params.exponent : null);
        case 'expIn': return d3.easeExpIn;
        case 'expOut': return d3.easeExpOut;
        case 'expInOut': return d3.easeExpInOut;
        default: return (n) => n;
    }
}

const addAnalyserToPage = (name, params) => {
    analysers[name] = new Analyser(aContext, player, params);
}

const updateAnalysers = (names) => {

    names.forEach((name) => {

        if (name === 'standard') {

            addAnalyserToPage(name, globalParams);

        } else if (name === 'staging') {

            addAnalyserToPage(name, {
                ...globalParams,
                ...stagingParams,
                xEasing: getEasingFunction(stagingParams.xEasingFunction, { exponent: stagingParams.xExponent }),
                yEasing: getEasingFunction(stagingParams.yEasingFunction, { exponent: stagingParams.yExponent })
            });

        }
    });

    drawOnce();

}

const drawCycle = () => {

    clear(cContext, 'analysers');

    if (globalParams.showBuckets) {
        if (stagingParams.compareMode) {
            drawFreqBuckets(cContext, analysers.standard);
        }
        drawFreqBuckets(cContext, analysers.staging);
    } else {
        if (stagingParams.compareMode) {
            drawFreqLines(cContext, analysers.standard);
        }
        drawFreqLines(cContext, analysers.staging);
    }

}

const drawOnce = () => {

    clear(cContext, 'analysers');
    clear(cContext, 'xAxis');
    clear(cContext, 'yAxis');
    clear(cContext, 'top');

    drawAnalyserBounds(cContext);

    drawXAxis(
        cContext,
        analysers.standard,
        20
    );

    drawEasing(cContext, 0, 0, 'fEasing', analysers.staging.xEasing);
    drawEasing(cContext, .2, 0, 'aEasing', analysers.staging.yEasing);

}

const render = () => {
    drawCycle();
    window.requestAnimationFrame(render);
}

init().then(() => {
    initGui();
    drawOnce();
    render();
});

addListeners();