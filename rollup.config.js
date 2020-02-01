import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { terser } from "rollup-plugin-terser";

export default {
    input: './src/index.js',
    output: [
        {
            file: 'build/bundle.min.js',
            format: 'iife',
            name: 'bundle',
            plugins: [terser()]
        }
    ],
    plugins: [
        resolve(),
        babel({
            exclude: 'node_modules/**' // only transpile source code
        })
    ]
};