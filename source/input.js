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

// Used to populate when site starts
function defaultSpirv() {
    return `         OpCapability Shader
         OpMemoryModel Logical GLSL450
         OpEntryPoint GLCompute %main "main"
         OpExecutionMode %main LocalSize 1 1 1
 %void = OpTypeVoid
 %func = OpTypeFunction %void
 %main = OpFunction %void None %func
%label = OpLabel
         OpReturn
         OpFunctionEnd`;
}

// Sends all checkboxes out to handlers
$(document).ready(function() {
    // Setup listeners for main input
    $('#disassembleDiv')[0].innerHTML = spirvTextToHtml(defaultSpirv());
    $('#disassembleDiv').on('input', parseInput);
    $('#disassembleDiv').on('keypress', function(event) {
        if(event.which === 13 && !event.shiftKey) {
            event.preventDefault();
            evaluateInput();
        }
    });
});

