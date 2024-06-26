# SPIR-V Playground

> Tested on Chrome and Firefox

[godbolt](https://godbolt.org/) / [shader-playground](https://shader-playground.timjones.io/) style web UI tool for experimenting with SPIR-V. The main difference is this is a tool solely designed for SPIR-V allowing a more rich set of features.

It also runs locally for security, speed, and personal customization

## Setting up

```
git clone --recursive git@github.com:sjfricke/SPIRV-Playground.git
cd SPIRV-Playground

npm install

node server.js
```

This will check your `PATH` to find dxc/slang/glslang and use it on your machine to run

It also makes use of local storage and will save the last successful command ran

## Using

Type/paste things on the left, hit `enter` and it will run and output on the right