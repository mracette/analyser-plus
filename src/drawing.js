import * as crco from 'crco-utils';

export const canvas = document.getElementById('canvas-viz');
canvas.height = canvas.clientHeight * window.devicePixelRatio;
canvas.width = canvas.clientWidth * window.devicePixelRatio;

const COORDS = new crco.CanvasCoordinates({ canvas, padding: .01, nxRange: [0, 1], nyRange: [0, 1] });

export const cContext = canvas.getContext('2d');
const FONT = 'sans-serif';
cContext.font = `${COORDS.getWidth() / 100}px ${FONT}`;
cContext.fillStyle = 'black';
cContext.strokeStyle = 'black';
cContext.lineWidth = COORDS.getHeight() / 60;
cContext.lineJoin = "round";

const COLORS = {
    STANDARD: '#CCCCCC',
    BLACK: '#000000',
    STAGING: '#0000FF',
    BOUNDS: '#000000'
};

const ANALYSER_PADDING = 0.1;
// const LABEL_PADDING = 0.05;

const AN_COORDS = new crco.CanvasCoordinates({
    paddingX: ANALYSER_PADDING,
    paddingY: ANALYSER_PADDING,
    nxRange: [0, 1],
    nyRange: [0, 1],
    baseHeight: COORDS.getHeight(),
    baseWidth: COORDS.getWidth()
});

const XAXIS_COORDS = new crco.CanvasCoordinates({
    xOffset: AN_COORDS.nx(0),
    yOffset: AN_COORDS.ny(1),
    nxRange: [0, 1],
    nyRange: [0, 1],
    baseWidth: AN_COORDS.getWidth(),
    baseHeight: COORDS.getHeight() * ANALYSER_PADDING / 2
})

const kFormatter = (num) => {
    return Math.abs(num) > 999 ? Math.sign(num) * ((Math.abs(num) / 1000).toFixed(1)) + 'k' : Math.sign(num) * Math.abs(num)
}

export const clear = (ctx, section) => {
    switch (section) {
        case 'analysers':
            ctx.clearRect(
                AN_COORDS.nx(0),
                AN_COORDS.ny(0),
                AN_COORDS.getWidth(),
                AN_COORDS.getHeight()
            );
            break;
        case 'xAxis':
            ctx.clearRect(
                COORDS.nx(0),
                COORDS.ny(1 - LABEL_PADDING) - ctx.lineWidth,
                COORDS.getWidth(),
                COORDS.getHeight() * (LABEL_PADDING) + ctx.lineWidth
            );
            break;
        case 'yAxis':
    }
}

export const drawFreqLines = (ctx, analyser) => {

    ctx.globalCompositeOperation = 'destination-over';

    const bMin = analyser.minFrequency;
    const bMax = analyser.maxFrequency;
    const bins = analyser.getFrequencyBins();

    if (analyser.id === 'standard') {
        ctx.strokeStyle = COLORS.STANDARD;
    } else if (analyser.id === 'staging') {
        ctx.strokeStyle = COLORS.STAGING;
    }

    ctx.lineWidth = COORDS.getHeight() / 60;

    ctx.beginPath();

    bins.forEach((d, i) => {

        const f = d.freq;

        let x = analyser.xEasing ?
            analyser.xEasing((f - bMin) / (bMax - bMin)) :
            (f - bMin) / (bMax - bMin);

        let y = 1 - d.data / 255;

        if (i === 0) {
            ctx.moveTo(
                AN_COORDS.nx(x),
                AN_COORDS.ny(y)
            );
        } else {
            ctx.lineTo(
                AN_COORDS.nx(x),
                AN_COORDS.ny(y)
            );
        }

    });

    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';

}

export const drawFreqBuckets = (ctx, analyser) => {

    const n = analyser.numBuckets;
    const bucketData = analyser.getFrequencyBuckets();
    const bucketWidth = COORDS.getWidth() * (1 - 2 * LABEL_PADDING) / n;

    ctx.beginPath();

    bucketData.forEach((d, i) => {

        const x = COORDS.nx(LABEL_PADDING + ANALYSER_PADDING + (1 - 2 * (LABEL_PADDING + ANALYSER_PADDING)) * (i / n));
        const x1 = x + bucketWidth;
        const y = COORDS.ny((1 - LABEL_PADDING - ANALYSER_PADDING) - (1 - LABEL_PADDING - ANALYSER_PADDING) * d / 255);

        ctx.moveTo(x, y);
        ctx.lineTo(x1, y);

    });

    ctx.stroke();

}

export const drawXAxis = (ctx, analyser, max) => {

    ctx.font = `${XAXIS_COORDS.getHeight() / 2.5}px ${FONT}`;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = 'black'
    ctx.lineWidth = XAXIS_COORDS.getWidth() / 500;

    // cap the number of labels
    const n = Math.min(max, analyser.frequencyBinCount);
    const bMin = analyser.minFrequency;
    const bMax = analyser.maxFrequency;

    ctx.beginPath();

    for (let i = 0; i <= n; i++) {

        const f = bMin + (i / n) * (bMax - bMin);

        let x = analyser.xEasing ?
            analyser.xEasing(i / n) :
            (i / n);

        ctx.moveTo(
            XAXIS_COORDS.nx(x),
            XAXIS_COORDS.ny(.5)
        );

        ctx.lineTo(
            XAXIS_COORDS.nx(x),
            XAXIS_COORDS.ny(0)
        );

        const text = kFormatter(Math.round(f)).toString();

        ctx.fillText(
            text,
            XAXIS_COORDS.nx(x),
            XAXIS_COORDS.ny(1)
        );

    }

    ctx.stroke();

}

export const drawAnalyserBounds = (ctx) => {

    ctx.strokeStyle = COLORS.BOUNDS;

    ctx.strokeRect(
        AN_COORDS.nx(0),
        AN_COORDS.ny(0),
        AN_COORDS.getWidth(),
        AN_COORDS.getHeight()
    );

}

export const drawEasing = (ctx, x, y, w, h, fn) => {

    ctx.strokeRect(COORDS.nx(x), COORDS.ny(y), w, h);

    const res = 63;

    for (let i = 0; i <= res; i++) {
        const x = COORDS.nx(x) + w * i / res;
        const y = COORDS.ny(y) - h * fn(i / res);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

}