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
// Editor global settings
var editorFontSize = 14;  // px

async function evaluateInputSource() {
    const selectedTool = document.getElementById('selectTool').value;
    const commandFlags = document.getElementById('commandFlags').value;
    var lastTool = selectedTool;

    var selectedTool2 = undefined;
    var commandFlags2 = undefined;
    var selectedTool3 = undefined;
    var commandFlags3 = undefined;
    if (hasPipeline2()) {
        selectedTool2 = document.getElementById('selectTool2').value;
        commandFlags2 = document.getElementById('commandFlags2').value;
        lastTool = selectedTool2;
    }
    if (hasPipeline3()) {
        selectedTool3 = document.getElementById('selectTool3').value;
        commandFlags3 = document.getElementById('commandFlags3').value;
        lastTool = selectedTool3;
    }

    const requestSettings = {
        method: 'POST',
        headers: {'Content-Type': ' application/json'},
        body: JSON.stringify({
            source: inputEditor.getValue(),
            tool: selectedTool,
            flags: commandFlags,
            tool2: selectedTool2,
            flags2: commandFlags2,
            tool3: selectedTool3,
            flags3: commandFlags3,
        })
    };

    outputEditor.setValue('Processing ...')
    const response = await fetch('compile', requestSettings).catch((error) => {
        setAlertBox(error + ' (did the node.js server disconnect?)', 4000);
    });

    const data = await response.json();
    console.log(data);
    if (data.success) {
        if (lastTool == 'spirv-val') {
            outputEditor.setValue('VALID SPIR-V');
        } else {
            outputEditor.setValue(data.output);
        }
        // save last good items
        localStorage.setItem('tool', selectedTool);
        localStorage.setItem('source-' + selectedTool, inputEditor.getValue());
        localStorage.setItem('flags-' + selectedTool, commandFlags);

        if (hasPipeline2()) {
            localStorage.setItem('tool2', selectedTool2);
            localStorage.setItem('flags2-' + selectedTool2, commandFlags2);
        }
        if (hasPipeline3()) {
            localStorage.setItem('tool3', selectedTool3);
            localStorage.setItem('flags3-' + selectedTool3, commandFlags3);
        }

    } else {
        var error = data.error.cmd + '\n-----------------------------------\n\n';
        if (data.error.stderr.length > 0) {
            error += data.error.stderr;
        } else {
            error += data.error.stdout;
        }
        outputEditor.setValue(error);
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
    loadPipelines();

    let localFontSize = localStorage.getItem('editorFontSize');
    editorFontSize = localFontSize ? localFontSize : editorFontSize;  // set starting value on load
    setFontSize(editorFontSize);

    const performanceEnd = performance.now();
    console.log('Start up time: ' + ((performanceEnd - performanceStart) / 1000).toFixed(3) + ' seconds');
}

function hasPipeline2() {
    return document.getElementById('pipeline2').style.display != 'none';
}
function hasPipeline3() {
    return document.getElementById('pipeline3').style.display != 'none';
}