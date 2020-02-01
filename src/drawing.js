import * as crco from 'crco-utils';

export const canvas = document.getElementById('canvas-viz');
canvas.height = canvas.clientHeight * window.devicePixelRatio;
canvas.width = canvas.clientWidth * window.devicePixelRatio;

const COORDS = new crco.CanvasCoordinates({ canvas, padding: .01, nxRange: [0, 1], nyRange: [0, 1] });

export const cContext = canvas.getContext('2d');

const COLORS = {
    STANDARD: '#CCCCCC',
    BLACK: '#000000',
    STAGING: '#0000FF',
    BOUNDS: '#000000'
};

const LINE_WIDTH = {
    large: COORDS.getHeight() / 60,
    medium: COORDS.getHeight() / 150,
    small: COORDS.getHeight() / 500
};

const FONT = 'sans-serif';

const ANALYSER_PADDING = 0.1;

const AN_COORDS = new crco.CanvasCoordinates({
    xOffset: LINE_WIDTH.large,
    yOffset: LINE_WIDTH.large,
    paddingX: ANALYSER_PADDING,
    paddingY: ANALYSER_PADDING,
    nxRange: [0, 1],
    nyRange: [0, 1],
    baseHeight: COORDS.getHeight() - 2 * LINE_WIDTH.large,
    baseWidth: COORDS.getWidth() - 2 * LINE_WIDTH.large
});

const XAXIS_COORDS = new crco.CanvasCoordinates({
    xOffset: AN_COORDS.nx(0),
    yOffset: AN_COORDS.ny(1),
    nxRange: [0, 1],
    nyRange: [0, 1],
    baseWidth: AN_COORDS.getWidth(),
    baseHeight: COORDS.getHeight() * ANALYSER_PADDING / 2
});

const YAXIS_COORDS = new crco.CanvasCoordinates({
    xOffset: 0,
    yOffset: 0,
    nxRange: [0, 1],
    nyRange: [0, 1],
    baseWidth: COORDS.getWidth() * ANALYSER_PADDING / 2,
    baseHeight: AN_COORDS.getHeight()
});

const TOP_COORDS = new crco.CanvasCoordinates({
    xOffset: AN_COORDS.nx(0),
    yOffset: COORDS.ny(0),
    nxRange: [0, 1],
    nyRange: [0, 1],
    baseWidth: AN_COORDS.getWidth(),
    baseHeight: COORDS.getHeight() * ANALYSER_PADDING
});

cContext.font = `${COORDS.getWidth() / 100}px ${FONT}`;
cContext.fillStyle = 'black';
cContext.strokeStyle = 'black';
cContext.lineJoin = "round";

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
                XAXIS_COORDS.nx(0),
                XAXIS_COORDS.ny(0),
                XAXIS_COORDS.getWidth(),
                XAXIS_COORDS.getHeight()
            );
            break;
        case 'yAxis':
            ctx.clearRect(
                YAXIS_COORDS.nx(0),
                YAXIS_COORDS.ny(0),
                YAXIS_COORDS.getWidth(),
                YAXIS_COORDS.getHeight()
            );
            break;
        case 'top':
            ctx.clearRect(
                TOP_COORDS.nx(0),
                TOP_COORDS.ny(0),
                TOP_COORDS.getWidth(),
                TOP_COORDS.getHeight()
            );
            break;
    }
}

export const drawFreqLines = (ctx, analyser) => {

    ctx.lineWidth = LINE_WIDTH.medium;
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

    ctx.lineWidth = LINE_WIDTH.medium;
    ctx.globalCompositeOperation = 'destination-over';

    if (analyser.id === 'standard') {
        ctx.strokeStyle = COLORS.STANDARD;
    } else if (analyser.id === 'staging') {
        ctx.strokeStyle = COLORS.STAGING;
    }

    const n = analyser.numBuckets;
    const bucketData = analyser.getFrequencyBuckets();
    const bucketWidth = AN_COORDS.getWidth() / n;

    ctx.beginPath();

    bucketData.forEach((d, i) => {

        const x = AN_COORDS.nx(i / n);
        const x1 = x + bucketWidth;
        const y = AN_COORDS.ny(1 - d / 255);

        ctx.moveTo(x, y);
        ctx.lineTo(x1, y);

    });

    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';

}

export const drawXAxis = (ctx, analyser, max) => {

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = LINE_WIDTH.small;
    ctx.font = `${XAXIS_COORDS.getHeight() / 2.5}px ${FONT}`;

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

    ctx.lineWidth = LINE_WIDTH.large;
    ctx.strokeStyle = COLORS.BOUNDS;

    ctx.strokeRect(
        AN_COORDS.nx(0),
        AN_COORDS.ny(0),
        AN_COORDS.getWidth(),
        AN_COORDS.getHeight()
    );

}

export const drawEasing = (ctx, x0, y0, text, fn) => {

    ctx.lineWidth = LINE_WIDTH.small;
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = COLORS.BLACK;

    const h = TOP_COORDS.getHeight();
    const w = h;

    ctx.strokeRect(TOP_COORDS.nx(x0) + w, TOP_COORDS.ny(y0), w, h);
    ctx.fillText(text, TOP_COORDS.nx(x0) + w / 2, TOP_COORDS.ny(0.5));

    const res = 63;
    ctx.beginPath();

    for (let i = 0; i <= res; i++) {
        const x = w + TOP_COORDS.nx(x0) + w * i / res;
        const y = TOP_COORDS.ny(y0) + h - h * fn(i / res);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

}