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

// Used to populate when site starts
function defaultSource(tool) {
    if (tool == 'dxc') {

        return `Texture2D textureColor : register(t1);
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

    } else if (tool == 'glslangValidator') {

        return `#version 450
layout(set = 0, binding = 0, rgba8) readonly uniform image2D myImage;
layout(set=0, binding=1, std430) buffer SSBO {
    vec4 data;
};

void main() {
    data = imageLoad(myImage, ivec2(0));
}`;

    } else if (tool == 'slangc') {

        return `StructuredBuffer<float> buffer0;
StructuredBuffer<float> buffer1;
RWStructuredBuffer<float> result;

[shader("compute")]
[numthreads(1,1,1)]
void computeMain(uint3 threadId : SV_DispatchThreadID)
{
    uint index = threadId.x;
    result[index] = buffer0[index] + buffer1[index];
}`;

    } else if (tool == 'spirv-val' || tool == 'spirv-opt' || tool == 'spirv-cross') {

        return `; SPIR-V
; Version: 1.5
; Generator: Khronos Glslang Reference Front End; 11
; Bound: 27
; Schema: 0
               OpCapability Shader
          %1 = OpExtInstImport "GLSL.std.450"
               OpMemoryModel Logical GLSL450
               OpEntryPoint GLCompute %main "main" %_
               OpExecutionMode %main LocalSize 1 1 1
               OpSource GLSL 450
               OpName %main "main"
               OpName %SSBO "SSBO"
               OpMemberName %SSBO 0 "a"
               OpMemberName %SSBO 1 "b"
               OpMemberName %SSBO 2 "c"
               OpName %_ ""
               OpMemberDecorate %SSBO 0 Offset 0
               OpMemberDecorate %SSBO 1 Offset 4
               OpMemberDecorate %SSBO 2 Offset 8
               OpDecorate %SSBO Block
               OpDecorate %_ DescriptorSet 0
               OpDecorate %_ Binding 0
       %void = OpTypeVoid
          %3 = OpTypeFunction %void
        %int = OpTypeInt 32 1
       %SSBO = OpTypeStruct %int %int %int
%_ptr_StorageBuffer_SSBO = OpTypePointer StorageBuffer %SSBO
          %_ = OpVariable %_ptr_StorageBuffer_SSBO StorageBuffer
      %int_0 = OpConstant %int 0
%_ptr_StorageBuffer_int = OpTypePointer StorageBuffer %int
       %bool = OpTypeBool
      %int_1 = OpConstant %int 1
      %int_2 = OpConstant %int 2
       %main = OpFunction %void None %3
          %5 = OpLabel
         %12 = OpAccessChain %_ptr_StorageBuffer_int %_ %int_0
         %13 = OpLoad %int %12
         %15 = OpSGreaterThan %bool %13 %int_0
               OpSelectionMerge %17 None
               OpBranchConditional %15 %16 %23
         %16 = OpLabel
         %20 = OpAccessChain %_ptr_StorageBuffer_int %_ %int_2
         %21 = OpLoad %int %20
         %22 = OpAccessChain %_ptr_StorageBuffer_int %_ %int_1
               OpStore %22 %21
               OpBranch %17
         %23 = OpLabel
         %24 = OpAccessChain %_ptr_StorageBuffer_int %_ %int_1
         %25 = OpLoad %int %24
         %26 = OpAccessChain %_ptr_StorageBuffer_int %_ %int_2
               OpStore %26 %25
               OpBranch %17
         %17 = OpLabel
               OpReturn
               OpFunctionEnd`;

    } else {
        return 'REPLACE WITH CODE';
    }
}

function defaultFlags(tool) {
    if (tool == 'dxc') {
        return "-spirv -T ps_6_5 -E main -fspv-target-env=vulkan1.2";
    } else if (tool == 'glslangValidator') {
        return "-S comp --target-env vulkan1.2";
    } else if (tool == 'slangc') {
        return "-profile glsl_450 -target spirv-asm -entry computeMain -lang slang";
    } else if (tool == 'spirv-val') {
        return '--target-env vulkan1.2';
    } else if (tool == 'spirv-opt') {
        return '-O --target-env vulkan1.2';
    } else if (tool == 'spirv-cross') {
        return '-V';
    } else {
        return '';
    }
}
