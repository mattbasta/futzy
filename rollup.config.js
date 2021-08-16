import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "dist/index.js",
  output: {
    dir: "build",
    format: "cjs",
  },
  plugins: [commonjs()],
};
