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
function defaultSource() {
    return `
Texture2D textureColor : register(t1);
SamplerState samplerColor : register(s1);

struct VSOutput
{
[[vk::location(0)]] float2 UV : TEXCOORD0;
[[vk::location(1)]] float LodBias : TEXCOORD3;
[[vk::location(2)]] float3 Normal : NORMAL0;
[[vk::location(3)]] float3 ViewVec : TEXCOORD1;
[[vk::location(4)]] float3 LightVec : TEXCOORD2;
};

float4 main(VSOutput input) : SV_TARGET
{
	float4 color = textureColor.SampleLevel(samplerColor, input.UV, input.LodBias);

	float3 N = normalize(input.Normal);
	float3 L = normalize(input.LightVec);
	float3 V = normalize(input.ViewVec);
	float3 R = reflect(-L, N);
	float3 diffuse = max(dot(N, L), 0.0) * float3(1.0, 1.0, 1.0);
	float specular = pow(max(dot(R, V), 0.0), 16.0) * color.a;

	return float4(diffuse * color.rgb + specular, 1.0);
}`;
}

function defaultFlags() {
    return "-spirv -T ps_6_5 -E main -fspv-target-env=vulkan1.2";
}

// Sends all checkboxes out to handlers
$(document).ready(function() {
    // Setup listeners for main input
    $('#disassembleDiv').on('input', parseInput);
    $('#disassembleDiv').on('keypress', function(event) {
        if(event.which === 13 && !event.shiftKey) {
            event.preventDefault();
            evaluateInputSource();
            // evaluateInputSpirv();
        }
    });
    $('#commandFlags').on('keypress', function(event) {
        if(event.which === 13 && !event.shiftKey) {
            event.preventDefault();
            evaluateInputSource();
            // evaluateInputSpirv();
        }
    });
});

async function loadTools() {
    const response = await fetch("getTools", {method: 'GET'});
    const tools = await response.json();

    var select = document.getElementById("selectTool");
    for (let i = 0; i < tools.length; i++) {
        let option = document.createElement('option');
        option.text = option.value = tools[i];
        select.appendChild(option);
    }

    // Load previous settings of working run
    var localSource = localStorage.getItem("spirvPlaygroundSource");
    var localTool = localStorage.getItem("spirvPlaygroundTool");
    var localFlags = localStorage.getItem("spirvPlaygroundFlags");

    if (localSource) {
        $('#disassembleDiv')[0].innerHTML = spirvTextToHtml(localSource);
    } else {
        $('#disassembleDiv')[0].innerHTML = spirvTextToHtml(defaultSource());
    }
    if (localTool) {
        document.getElementById('selectTool').value = localTool;
    }
    if (localFlags) {
        document.getElementById('commandFlags').value = localFlags;
    } else {
        document.getElementById('commandFlags').value = defaultFlags();
    }
}