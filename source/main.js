// Copyright (c) 2024 The Khronos Group Inc.
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

// Editor global objects
var inputEditor;
var outputEditor;

async function evaluateInputSource() {
    const selectedTool = document.getElementById('selectTool').value;
    const commandFlags = document.getElementById('commandFlags').value;

    const requestSettings = {
        method: 'POST',
        headers: {'Content-Type': ' application/json'},
        body: JSON.stringify({source: inputEditor.getValue(), tool: selectedTool, flags: commandFlags})
    };

    outputEditor.setValue('Processing ...')
    const response = await fetch('compile', requestSettings).catch((error) => {
        setAlertBox(error + ' (did the node.js server disconnect?)', 4000);
    });

    const data = await response.json();

    if (data.success) {
        if (selectedTool == 'spirv-val') {
            outputEditor.setValue('VALID SPIR-V');
        } else {
            outputEditor.setValue(data.output);
        }
        // save last good items
        localStorage.setItem('tool', selectedTool);
        localStorage.setItem('source-' + selectedTool, inputEditor.getValue());
        localStorage.setItem('flags-' + selectedTool, commandFlags);
    } else if (data.error.stderr.length > 0) {
        outputEditor.setValue(data.error.stderr);
    } else {
        outputEditor.setValue(data.error.stdout);
    }
}

// main entrypoint once all the libraries and DOM have loaded
function loadPlayground(spirvHeaderPath) {
    const performanceStart = performance.now();
    loadSpirv(spirvHeaderPath);

    inputEditor = CodeMirror(
        document.getElementById('inputEditorDiv'),
        {lineNumbers: true, matchBrackets: true, styleActiveLine: true, lineWrapping: true, indentUnit: 4});

    outputEditor = CodeMirror(document.getElementById('outputEditorDiv'), {
        mode: 'text/x-spirv',
        readOnly: true,
        lineNumbers: true,
        lineWrapping: true,
    });

    loadTools();
    loadKeyHooks();

    const performanceEnd = performance.now();
    console.log('Start up time: ' + ((performanceEnd - performanceStart) / 1000).toFixed(3) + ' seconds');
}
