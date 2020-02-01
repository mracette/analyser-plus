import * as crco from 'crco-utils';
import * as d3 from 'd3-ease';
import * as dat from 'dat.gui';
import { Analyser } from './analyser';
import { cContext, drawFreqLines, drawFreqBuckets, drawXAxis, drawAnalyserBounds, drawEasing, clear } from './drawing';

const AUDIO_PATH = '../audio/rhythm.mp3';
const GUI = new dat.GUI();

const startButton = document.getElementById('start-button');
const aContext = new AudioContext();

let audioState = 'stopped';
let buffer;
let player;
let analysers = {};

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
    smoothingTimeConstant: .8
}

const easingParams = {
    'xEasingExponent': 1.5,
    'yEasingExponent': 1.5
}

const easings = {
    'none': (n) => n,
    'polyIn': d3.easePolyIn,
    'polyOut': d3.easePolyOut,
    'polyInOut': d3.easePolyInOut,
    'expIn': d3.easeExpIn,
    'expOut': d3.easeExpOut,
    'expInOut': d3.easeExpInOut
};

const init = () => {
    return new Promise((resolve, reject) => {
        crco.createAudioPlayer(aContext, AUDIO_PATH).then((p) => {
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
                xEasing: easings[stagingParams.xEasingFunction],
                yEasing: easings[stagingParams.yEasingFunction],
            });
            initGui();
            resolve();
        }).catch(err => reject(err));
    });
}

const initGui = () => {

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
    staging.add(stagingParams, 'xEasingFunction').options(Object.keys(easings))
    staging.add(easingParams, 'xEasingExponent', .1, 5, .1);
    staging.add(stagingParams, 'yEasingFunction').options(Object.keys(easings));
    staging.add(easingParams, 'yEasingExponent', .1, 5, .1);
    staging.add(stagingParams, 'smoothingTimeConstant', 0, 1, .01);
    staging.__controllers.forEach((c) => c.onChange(() => updateAnalysers(['staging'])));

}

const addListeners = () => {

    startButton.addEventListener('click', () => {

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

    })
}

const addAnalyserToPage = (name, params) => {
    analysers[name] = new Analyser(aContext, player, params);
}

const updateAnalysers = (names) => {

    names.forEach((name) => {

        if (name === 'standard') {

            addAnalyserToPage(name, globalParams);

        } else if (name === 'staging') {

            const xfnName = stagingParams.xEasingFunction
            const xfn = easings[xfnName];
            let xEasing;
            if (xfnName.includes('poly')) {
                xEasing = xfn.exponent(easingParams.xEasingExponent);
            } else {
                xEasing = xfn;
            }

            const yfnName = stagingParams.yEasingFunction
            const yfn = easings[yfnName];
            let yEasing;
            if (yfnName.includes('poly')) {
                yEasing = yfn.exponent(easingParams.yEasingExponent);
            } else {
                yEasing = yfn;
            }

            console.log(xEasing);
            addAnalyserToPage(name, {
                ...globalParams,
                ...stagingParams,
                xEasing,
                yEasing
            });

        }
    });


    clear(cContext, 'xAxis');
    drawXAxis(cContext, analysers.standard, 20);

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

    drawAnalyserBounds(cContext);

    drawXAxis(
        cContext,
        analysers.standard,
        20
    );

    // drawEasing(
    //     cContext

    // )

}

const render = () => {
    drawCycle();
    window.requestAnimationFrame(render);
}

init().then(() => {
    drawOnce();
    render();
});

addListeners();