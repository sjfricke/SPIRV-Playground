# SPIR-V Playground

> Tested on Chrome and Firefox

[godbolt](https://godbolt.org/) / [shader-playground](https://shader-playground.timjones.io/) style web UI tool for experimenting with SPIR-V. The main difference is this is a tool solely designed for SPIR-V allowing a more rich set of features.

It also runs locally for security, speed, and personal customization

## Setting up

```bash
git clone --recursive git@github.com:sjfricke/SPIRV-Playground.git
cd SPIRV-Playground

npm install

# This will check your `PATH` to find dxc/slang/glslang and use it on your machine to run
node server.js

# every tool can have its path manually set as well
node server.js --slangc C:\path\to\slangc.exe --dxc C:\path\to\dxc.exe
```

## Using

Type/paste things on the left, hit `enter` and it will run and output on the right

It also makes use of local storage and will save the last successful command ran