// Copyright (c) 2021-2023 The Khronos Group Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict';

// Grab all DOM objects

const disassembleDiv = document.getElementById('disassembleDiv');

var spirvBinary;

var hasError = false
function parseInput(event) {
    if (hasError) {
        hasError = false
        Array.from(disassembleDiv.getElementsByClassName('error')).forEach(function(element) {
            element.classList.remove('error')
        });
    }
}

function results(data) {
    console.log(data);
}

async function evaluateInputSource() {
    const selectedTool = document.getElementById('selectTool').value;
    const commandFlags = document.getElementById('commandFlags').value;

    const requestSettings = {
        method: 'POST',
        headers: {'Content-Type': ' application/json'},
        body: JSON.stringify({source: disassembleDiv.innerText, tool: selectedTool, flags: commandFlags})
    };

    var result_div = document.getElementById('resultText');
    result_div.innerHTML = ''
    const response = await fetch("compile", requestSettings);
    if (response.status != 200) {
        // TODO - Handle error
    }
    const data = await response.json();

    if (data.success) {
        if (selectedTool == 'spirv-val') {
            result_div.innerHTML = 'VALID SPIR-V'
        } else {
            result_div.innerHTML = spirvTextToHtml(data.output);
        }
        // save last good items
        localStorage.setItem('tool', selectedTool);
        localStorage.setItem('source-' + selectedTool, disassembleDiv.innerText);
        localStorage.setItem('flags-' + selectedTool, commandFlags);
    } else if (data.error.stderr.length > 0) {
        result_div.innerHTML = spirvTextToHtml(data.error.stderr);
    } else {
        result_div.innerHTML = spirvTextToHtml(data.error.stdout);
    }
}

async function evaluateInputSpirv() {
    const requestSettings = {
        method: 'POST',
        headers: {
            'Content-Type': ' application/json'
        },
        body: JSON.stringify({ spirv : disassembleDiv.innerText, targetEnv : "vulkan1.3" })
    };

    document.getElementById('resultText').innerHTML = ''
    const response = await fetch("validate", requestSettings);
    if (response.status != 200) {
        // TODO - Handle error
    }
    const data = await response.json();

    if (data.success) {
        document.getElementById('resultText').innerHTML = spirvTextToHtml(data.spirv);
    } else if (!data.commands.as) {
        let line = parseInt(data.error.stderr.split(':')[1]) - 1
        let temp = disassembleDiv.innerText.split('\n')
        temp[line] = `<span class="error">${temp[line]}</span>`
        disassembleDiv.innerHTML = spirvTextToHtml(temp.join('\n'))
        hasError = true;
        console.log(data.error.stderr.split(':')[3]);
    } else if (!data.commands.val) {
        console.log("Failed spirv-val");
    } else if (!data.commands.opt) {
        console.log("Failed spirv-opt");
    } else if (!data.commands.dis) {
        console.log("Failed spirv-dis");
    }
}

// main entrypoint
function loadPlayground(spirvHeaderPath) {
    loadSpirv(spirvHeaderPath);
    loadTools();
}

// a[5] = a[5].substring(0, 9) + '<span class="error">' + a[5].substring(9, 23) + '</span>' + a[5].substring(23, a[5].length)

// const performanceStart = performance.now();
// const performanceEnd = performance.now();
// ((performanceEnd - performanceStart) / 1000).toFixed(3)