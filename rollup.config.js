
import ts from 'rollup-plugin-typescript2';
import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    plugins: [
        ts(),
        buble(),
        nodeResolve()
    ]
};
