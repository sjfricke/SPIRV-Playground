# SPIR-V Playground

> Tested on Chrome and Firefox

[godbolt](https://godbolt.org/) / [shader-playground](https://shader-playground.timjones.io/) style web UI tool for experimenting with SPIR-V. The main difference is this is a tool solely designed for SPIR-V allowing a more rich set of features

Disassembled SPIR-V is placed as an input, from there various tools can be ran on it:

- `spirv-val`
    - Great for hand editing SPIR-V and making sure it is valid still
- `spirv-opt`
    - See what different optimizations are doing
