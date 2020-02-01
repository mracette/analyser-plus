import * as d3 from 'd3-ease';

export class Analyser {

    constructor(context, input, params) {

        this.input = input;
        this.context = context;

        const defaults = {
            id: null,
            power: 13,
            minDecibels: -130,
            maxDecibels: 0,
            minFrequency: 20,
            maxFrequency: 16500,
            smoothingTimeConstant: 0.8,
            numBuckets: 10,
            split: false,
            aWeighted: false,
            xEasing: undefined,
            yEasing: undefined,
            binMethod: 'center'
        }

        Object.assign(this, { ...defaults, ...params });
        this.fftSize = Math.pow(2, this.power);
        this.frequencyBinCount = this.fftSize / 2;
        this.nyquist = this.context.sampleRate / 2;
        this.binSize = this.nyquist / this.frequencyBinCount;
        this.adj =
            this.binMethod === 'center' ? 0.5 :
                this.binMethod === 'start' ? 0 :
                    this.binMethod === 'end' ? 1 : 0.5;

        // represents the first and last bin to take to stay true to frequency bounds
        // errs on the side of preserving more data
        this.binMin = Math.floor(this.minFrequency / this.binSize);
        this.binMax = this.frequencyBinCount - Math.floor((this.nyquist - this.maxFrequency) / this.binSize);

        // update the min / max according to the actual calculated above
        this.minFrequency = (this.binMin + this.adj) * this.binSize;
        this.maxFrequency = (this.binMax + this.adj) * this.binSize;

        // convert any string easing params into functions
        if (typeof this.xEasing === 'string') {
            switch (this.xEasing) {
                case 'polyIn': this.xEasing = d3.easePolyIn.exponent(this.xExponent); break;
                case 'polyOut': this.xEasing = d3.easePolyOut.exponent(this.xExponent); break;
                case 'polyInOut': this.xEasing = d3.easePolyInOut.exponent(this.xExponent); break;
                default: this.xEasing = (n) => n; break;
            }
        }

        if (typeof this.yEasing === 'string') {
            switch (this.yEasing) {
                case 'polyIn': this.yEasing = d3.easePolyIn.exponent(this.yExponent); break;
                case 'polyOut': this.yEasing = d3.easePolyOut.exponent(this.yExponent); break;
                case 'polyInOut': this.yEasing = d3.easePolyInOut.exponent(this.yExponent); break;
                default: this.yEasing = (n) => n; break;
            }
        }

        this.createAudioNodes();
        this.createDataStructure();
        this.aWeighted && this.createAWeights();

    }

    createAudioNodes(split = this.split) {

        if (split) {

            // if split === true, this.analyser is an obj with 'left' and 'right' properties
            const splitter = this.context.createChannelSplitter(2);

            // feed in the input
            this.input.connect(splitter);

            this.analyser = {};
            this.analyser.left = this.context.createAnalyser();
            this.analyser.right = this.context.createAnalyser();

            splitter.connect(this.analyser.left, 0);
            splitter.connect(this.analyser.right, 1);

            // web audio parameters
            this.analyser.left.fftSize = Math.pow(2, this.power);
            this.analyser.left.minDecibels = this.minDecibels;
            this.analyser.left.maxDecibels = this.maxDecibels;
            this.analyser.left.smoothingTimeConstant = this.smoothingTimeConstant;

            // web audio parameters
            this.analyser.right.fftSize = Math.pow(2, this.power);
            this.analyser.right.minDecibels = this.minDecibels;
            this.analyser.right.maxDecibels = this.maxDecibels;
            this.analyser.right.smoothingTimeConstant = this.smoothingTimeConstant;

        } else {

            // if split === false, this.analser is a single stereo analyser
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = Math.pow(2, this.power);
            this.analyser.minDecibels = this.minDecibels;
            this.analyser.maxDecibels = this.maxDecibels;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

            // feed in the input
            this.input.connect(this.analyser);

        }

    }

    createDataStructure(split = this.split) {

        if (split) {

            this.fftData = {};
            this.timeData = {};
            this.fftData.left = new Uint8Array(this.analyser.left.frequencyBinCount);
            this.fftData.right = new Uint8Array(this.analyser.right.frequencyBinCount);
            this.timeData.left = new Uint8Array(this.analyser.left.fftSize);
            this.timeData.right = new Uint8Array(this.analyser.right.fftSize);

        } else {

            this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeData = new Uint8Array(this.analyser.fftSize);

        }

    }

    createAWeights() {

        const a = (f) => {
            var f2 = f * f;
            return 1.2588966 * 148840000 * f2 * f2 /
                ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000));
        };

        // get the center point of each frequency bin
        const bins = [];
        const binSize = this.nyquist / this.frequencyBinCount;

        for (let i = 0; i < this.frequencyBinCount; i++) {
            bins[i] = (i + 0.5) * binSize;
        }

        this.aWeights = bins.map(f => a(f));

    }

    getFrequencyData(channel) {

        if (channel === 'left' || channel === 'right') {
            this.analyser[channel].getByteFrequencyData(this.fftData[channel]); // refresh in place
            this.yEasing && this.fftData[channel].forEach((d, i, a) => a[i] = 255 * this.yEasing(d / 255)); // map in place
            this.aWeights && this.fftData[channel].forEach((d, i, a) => a[i] = this.aWeights[i] * d); // map in place
            return this.fftData[channel];
        } else {
            this.analyser.getByteFrequencyData(this.fftData); // refresh in place
            this.yEasing && this.fftData.forEach((d, i, a) => a[i] = 255 * this.yEasing(d / 255)); // map in place
            this.aWeighted && this.fftData.forEach((d, i, a) => a[i] = this.aWeights[i] * d); // map in place
            return this.fftData;
        }

    }

    getFrequencyBins(channel) {

        const fBins = [];
        const data = this.getFrequencyData(channel).slice(this.binMin, this.binMax + 1);

        data.forEach((d, i) => {
            fBins.push({
                data: d,
                freq: (this.binMin + i + this.adj) * this.binSize
            });
        });

        return fBins;

    }

    getFrequencyBuckets(channel) {

        const bucketCounts = new Array(this.numBuckets).fill(0, 0, this.numBuckets);
        const bucketData = new Array(this.numBuckets).fill(0, 0, this.numBuckets);
        const data = this.getFrequencyData(channel)

        for (let i = this.binMin; i <= this.binMax; i++) {
            const n = this.xEasing ?
                Math.floor(this.xEasing(i / (this.binMax - this.binMin + 1)) * this.numBuckets) :
                Math.floor((i / (this.binMax - this.binMin + 1)) * this.numBuckets);

            bucketData[n] += data[i];
            bucketCounts[n] += 1;

        }
        // console.log(bucketCounts);

        bucketData.forEach((d, i, a) => a[i] = d / bucketCounts[i]);

        return bucketData;

    }

    getTimeData(channel) {

        if (channel === 'left' || channel === 'right') {
            this.analyser[channel].getByteTimeDomainData(this.timeData[channel]);
            return this.timeData[channel];
        } else {
            this.analyser.getByteTimeDomainData(this.timeData);
            return this.timeData;
        }

    }

    reconnect(newInput) {
        this.input.disconnect();
        newInput.connect(this.analyser);
    }

}