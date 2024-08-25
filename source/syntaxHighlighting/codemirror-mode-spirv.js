// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function (mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../../lib/codemirror"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function (CodeMirror) {
    "use strict";

    CodeMirror.defineMode("spirv", function (config, parserConfig) {
        function tokenString(quote) {
            return function (stream) {
                var escaped = false, next, end = false;
                while ((next = stream.next()) !== null) {
                    if (next == quote && !escaped) {
                        end = true;
                        break;
                    }
                    escaped = !escaped && next == "\\";
                }
                return "string";
            };
        }

        function contains(words, word) {
            if (typeof words === "function") {
                return words(word);
            } else {
                return words.propertyIsEnumerable(word);
            }
        }

        // TODO - Generate from SPIRV-Headers
        // List of SPIR-V keywords from https://github.com/kbenzie/vim-spirv/blob/e71404f92990aa4718925ade568427c0d8631469/syntax/spirv.vim

        var keywords = "OpPhi,OpSelectionMerge,OpBranch,OpBranchConditional," +
            "OpSwitch,OpKill,OpReturn,OpReturnValue,OpUnreachable,OpLifetimeStart," +
            "OpLifetimeStop," +
            "OpSource,OpSourceContinued,OpSourceExtension,OpName," +
            "OpMemberName,OpString,OpLine,OpNoLine,OpModuleProcessed," +
            "None,Bias,Lod,Grad,ConstOffset,Offset,ConstOffsets," +
            "Sample,MinLod,MakeTexelAvailable,MakeTexelAvailableKHR,MakeTexelVisible," +
            "MakeTexelVisibleKHR,NonPrivateTexel,NonPrivateTexelKHR,VolatileTexel," +
            "VolatileTexelKHR,SignExtend,ZeroExtend,NotNaN,NotInf,NSZ,AllowRecip,Fast," +
            "Flatten,DontFlatten,Unroll,DontUnroll,DependencyInfinite,DependencyLength," +
            "MinIterations,MaxIterations,IterationMultiple,PeelCount,PartialCount,Inline," +
            "DontInline,Pure,Const,Relaxed,Acquire,Release,AcquireRelease," +
            "SequentiallyConsistent,UniformMemory,SubgroupMemory,WorkgroupMemory," +
            "CrossWorkgroupMemory,AtomicCounterMemory,ImageMemory,OutputMemory," +
            "OutputMemoryKHR,MakeAvailable,MakeAvailableKHR,MakeVisible,MakeVisibleKHR," +
            "Volatile,Aligned,Nontemporal,MakePointerAvailable,MakePointerAvailableKHR," +
            "MakePointerVisible,MakePointerVisibleKHR,NonPrivatePointer," +
            "NonPrivatePointerKHR,CmdExecTime,Unknown,ESSL,GLSL,OpenCL_C,OpenCL_CPP,HLSL," +
            "Vertex,TessellationControl,TessellationEvaluation,Geometry,Fragment,GLCompute," +
            "Kernel,TaskNV,MeshNV,RayGenerationNV,IntersectionNV,AnyHitNV,ClosestHitNV," +
            "MissNV,CallableNV,Logical,Physical32,Physical64,PhysicalStorageBuffer64," +
            "PhysicalStorageBuffer64EXT,Simple,GLSL450,OpenCL,Vulkan,VulkanKHR,Invocations," +
            "SpacingEqual,SpacingFractionalEven,SpacingFractionalOdd,VertexOrderCw," +
            "VertexOrderCcw,PixelCenterInteger,OriginUpperLeft,OriginLowerLeft," +
            "EarlyFragmentTests,PointMode,Xfb,DepthReplacing,DepthGreater,DepthLess," +
            "DepthUnchanged,LocalSize,LocalSizeHint,InputPoints,InputLines," +
            "InputLinesAdjacency,Triangles,InputTrianglesAdjacency,Quads,Isolines," +
            "OutputVertices,OutputPoints,OutputLineStrip,OutputTriangleStrip,VecTypeHint," +
            "ContractionOff,Initializer,Finalizer,SubgroupSize,SubgroupsPerWorkgroup," +
            "SubgroupsPerWorkgroupId,LocalSizeId,LocalSizeHintId,PostDepthCoverage," +
            "DenormPreserve,DenormFlushToZero,SignedZeroInfNanPreserve,RoundingModeRTE," +
            "RoundingModeRTZ,StencilRefReplacingEXT,OutputLinesNV,OutputPrimitivesNV," +
            "DerivativeGroupQuadsNV,DerivativeGroupLinearNV,OutputTrianglesNV," +
            "PixelInterlockOrderedEXT,PixelInterlockUnorderedEXT,SampleInterlockOrderedEXT," +
            "SampleInterlockUnorderedEXT,ShadingRateInterlockOrderedEXT," +
            "ShadingRateInterlockUnorderedEXT,UniformConstant,Input,Uniform,Output," +
            "Workgroup,CrossWorkgroup,Private,Function,Generic,PushConstant,AtomicCounter," +
            "Image,StorageBuffer,CallableDataNV,IncomingCallableDataNV,RayPayloadNV," +
            "HitAttributeNV,IncomingRayPayloadNV,ShaderRecordBufferNV,PhysicalStorageBuffer," +
            "PhysicalStorageBufferEXT,1D,2D,3D,Cube,Rect,Buffer,SubpassData,ClampToEdge," +
            "Clamp,Repeat,RepeatMirrored,Nearest,Linear,Rgba32f,Rgba16f,R32f,Rgba8," +
            "Rgba8Snorm,Rg32f,Rg16f,R11fG11fB10f,R16f,Rgba16,Rgb10A2,Rg16,Rg8,R16,R8," +
            "Rgba16Snorm,Rg16Snorm,Rg8Snorm,R16Snorm,R8Snorm,Rgba32i,Rgba16i,Rgba8i,R32i," +
            "Rg32i,Rg16i,Rg8i,R16i,R8i,Rgba32ui,Rgba16ui,Rgba8ui,R32ui,Rgb10a2ui,Rg32ui," +
            "Rg16ui,Rg8ui,R16ui,R8ui,R,A,RG,RA,RGB,RGBA,BGRA,ARGB,Intensity,Luminance,Rx," +
            "RGx,RGBx,Depth,DepthStencil,sRGB,sRGBx,sRGBA,sBGRA,ABGR,SnormInt8,SnormInt16," +
            "UnormInt8,UnormInt16,UnormShort565,UnormShort555,UnormInt101010,SignedInt8," +
            "SignedInt16,SignedInt32,UnsignedInt8,UnsignedInt16,UnsignedInt32,HalfFloat," +
            "Float,UnormInt24,UnormInt101010_2,RTE,RTZ,RTP,RTN,Export,Import,ReadOnly," +
            "WriteOnly,ReadWrite,Zext,Sext,ByVal,Sret,NoAlias,NoCapture,NoWrite,NoReadWrite," +
            "RelaxedPrecision,SpecId,Block,BufferBlock,RowMajor,ColMajor,ArrayStride," +
            "MatrixStride,GLSLShared,GLSLPacked,CPacked,BuiltIn,NoPerspective,Flat,Patch," +
            "Centroid,Invariant,Restrict,Aliased,Constant,Coherent,NonWritable,NonReadable," +
            "UniformId,SaturatedConversion,Stream,Location,Component,Index,Binding," +
            "DescriptorSet,XfbBuffer,XfbStride,FuncParamAttr,FPRoundingMode,FPFastMathMode," +
            "LinkageAttributes,NoContraction,InputAttachmentIndex,Alignment,MaxByteOffset," +
            "AlignmentId,MaxByteOffsetId,NoSignedWrap,NoUnsignedWrap,ExplicitInterpAMD," +
            "OverrideCoverageNV,PassthroughNV,ViewportRelativeNV," +
            "SecondaryViewportRelativeNV,PerPrimitiveNV,PerViewNV,PerTaskNV,PerVertexNV," +
            "NonUniform,NonUniformEXT,RestrictPointer,RestrictPointerEXT,AliasedPointer," +
            "AliasedPointerEXT,CounterBuffer,HlslCounterBufferGOOGLE,UserSemantic," +
            "HlslSemanticGOOGLE,UserTypeGOOGLE,Position,PointSize,ClipDistance,CullDistance," +
            "VertexId,InstanceId,PrimitiveId,InvocationId,Layer,ViewportIndex," +
            "TessLevelOuter,TessLevelInner,TessCoord,PatchVertices,FragCoord,PointCoord," +
            "FrontFacing,SampleId,SamplePosition,SampleMask,FragDepth,HelperInvocation," +
            "NumWorkgroups,WorkgroupSize,WorkgroupId,LocalInvocationId,GlobalInvocationId," +
            "LocalInvocationIndex,WorkDim,GlobalSize,EnqueuedWorkgroupSize,GlobalOffset," +
            "GlobalLinearId,SubgroupMaxSize,NumSubgroups,NumEnqueuedSubgroups,SubgroupId," +
            "SubgroupLocalInvocationId,VertexIndex,InstanceIndex,SubgroupEqMask," +
            "SubgroupGeMask,SubgroupGtMask,SubgroupLeMask,SubgroupLtMask,SubgroupEqMaskKHR," +
            "SubgroupGeMaskKHR,SubgroupGtMaskKHR,SubgroupLeMaskKHR,SubgroupLtMaskKHR," +
            "BaseVertex,BaseInstance,DrawIndex,DeviceIndex,ViewIndex,BaryCoordNoPerspAMD," +
            "BaryCoordNoPerspCentroidAMD,BaryCoordNoPerspSampleAMD,BaryCoordSmoothAMD," +
            "BaryCoordSmoothCentroidAMD,BaryCoordSmoothSampleAMD,BaryCoordPullModelAMD," +
            "FragStencilRefEXT,ViewportMaskNV,SecondaryPositionNV,SecondaryViewportMaskNV," +
            "PositionPerViewNV,ViewportMaskPerViewNV,FullyCoveredEXT,TaskCountNV," +
            "PrimitiveCountNV,PrimitiveIndicesNV,ClipDistancePerViewNV," +
            "CullDistancePerViewNV,LayerPerViewNV,MeshViewCountNV,MeshViewIndicesNV," +
            "BaryCoordNV,BaryCoordNoPerspNV,FragSizeEXT,FragmentSizeNV," +
            "FragInvocationCountEXT,InvocationsPerPixelNV,LaunchIdNV,LaunchSizeNV," +
            "WorldRayOriginNV,WorldRayDirectionNV,ObjectRayOriginNV,ObjectRayDirectionNV," +
            "RayTminNV,RayTmaxNV,InstanceCustomIndexNV,ObjectToWorldNV,WorldToObjectNV," +
            "HitTNV,HitKindNV,IncomingRayFlagsNV,WarpsPerSMNV,SMCountNV,WarpIDNV,SMIDNV," +
            "CrossDevice,Device,Subgroup,Invocation,QueueFamily,QueueFamilyKHR,Reduce," +
            "InclusiveScan,ExclusiveScan,ClusteredReduce,PartitionedReduceNV," +
            "PartitionedInclusiveScanNV,PartitionedExclusiveScanNV,NoWait,WaitKernel," +
            "WaitWorkGroup,Matrix,Shader,Tessellation,Addresses,Linkage,Vector16," +
            "Float16Buffer,Float16,Float64,Int64,Int64Atomics,ImageBasic,ImageReadWrite," +
            "ImageMipmap,Pipes,Groups,DeviceEnqueue,LiteralSampler,AtomicStorage,Int16," +
            "TessellationPointSize,GeometryPointSize,ImageGatherExtended," +
            "StorageImageMultisample,UniformBufferArrayDynamicIndexing," +
            "SampledImageArrayDynamicIndexing,StorageBufferArrayDynamicIndexing," +
            "StorageImageArrayDynamicIndexing,ImageCubeArray,SampleRateShading,ImageRect," +
            "SampledRect,GenericPointer,Int8,InputAttachment,SparseResidency,Sampled1D," +
            "Image1D,SampledCubeArray,SampledBuffer,ImageBuffer,ImageMSArray," +
            "StorageImageExtendedFormats,ImageQuery,DerivativeControl,InterpolationFunction," +
            "TransformFeedback,GeometryStreams,StorageImageReadWithoutFormat," +
            "StorageImageWriteWithoutFormat,MultiViewport,SubgroupDispatch,NamedBarrier," +
            "PipeStorage,GroupNonUniform,GroupNonUniformVote,GroupNonUniformArithmetic," +
            "GroupNonUniformBallot,GroupNonUniformShuffle,GroupNonUniformShuffleRelative," +
            "GroupNonUniformClustered,GroupNonUniformQuad,ShaderLayer,ShaderViewportIndex," +
            "SubgroupBallotKHR,DrawParameters,SubgroupVoteKHR,StorageBuffer16BitAccess," +
            "StorageUniformBufferBlock16,UniformAndStorageBuffer16BitAccess," +
            "StorageUniform16,StoragePushConstant16,StorageInputOutput16,DeviceGroup," +
            "MultiView,VariablePointersStorageBuffer,VariablePointers,AtomicStorageOps," +
            "SampleMaskPostDepthCoverage,StorageBuffer8BitAccess," +
            "UniformAndStorageBuffer8BitAccess,StoragePushConstant8,Float16ImageAMD," +
            "ImageGatherBiasLodAMD,FragmentMaskAMD,StencilExportEXT,ImageReadWriteLodAMD," +
            "ShaderClockKHR,SampleMaskOverrideCoverageNV,GeometryShaderPassthroughNV," +
            "ShaderViewportIndexLayerEXT,ShaderViewportIndexLayerNV,ShaderViewportMaskNV," +
            "ShaderStereoViewNV,PerViewAttributesNV,FragmentFullyCoveredEXT,MeshShadingNV," +
            "ImageFootprintNV,FragmentBarycentricNV,ComputeDerivativeGroupQuadsNV," +
            "FragmentDensityEXT,ShadingRateNV,GroupNonUniformPartitionedNV,ShaderNonUniform," +
            "ShaderNonUniformEXT,RuntimeDescriptorArray,RuntimeDescriptorArrayEXT," +
            "InputAttachmentArrayDynamicIndexing,InputAttachmentArrayDynamicIndexingEXT," +
            "UniformTexelBufferArrayDynamicIndexing," +
            "UniformTexelBufferArrayDynamicIndexingEXT," +
            "StorageTexelBufferArrayDynamicIndexing," +
            "StorageTexelBufferArrayDynamicIndexingEXT,UniformBufferArrayNonUniformIndexing," +
            "UniformBufferArrayNonUniformIndexingEXT,SampledImageArrayNonUniformIndexing," +
            "SampledImageArrayNonUniformIndexingEXT,StorageBufferArrayNonUniformIndexing," +
            "StorageBufferArrayNonUniformIndexingEXT,StorageImageArrayNonUniformIndexing," +
            "StorageImageArrayNonUniformIndexingEXT,InputAttachmentArrayNonUniformIndexing," +
            "InputAttachmentArrayNonUniformIndexingEXT," +
            "UniformTexelBufferArrayNonUniformIndexing," +
            "UniformTexelBufferArrayNonUniformIndexingEXT," +
            "StorageTexelBufferArrayNonUniformIndexing," +
            "StorageTexelBufferArrayNonUniformIndexingEXT,RayTracingNV,VulkanMemoryModel," +
            "VulkanMemoryModelKHR,VulkanMemoryModelDeviceScope," +
            "VulkanMemoryModelDeviceScopeKHR,PhysicalStorageBufferAddresses," +
            "PhysicalStorageBufferAddressesEXT,ComputeDerivativeGroupLinearNV," +
            "CooperativeMatrixNV,FragmentShaderSampleInterlockEXT," +
            "FragmentShaderShadingRateInterlockEXT,ShaderSMBuiltinsNV," +
            "FragmentShaderPixelInterlockEXT,DemoteToHelperInvocationEXT," +
            "SubgroupShuffleINTEL,SubgroupBufferBlockIOINTEL,SubgroupImageBlockIOINTEL," +
            "SubgroupImageMediaBlockIOINTEL,IntegerFunctions2INTEL," +
            "SubgroupAvcMotionEstimationINTEL,SubgroupAvcMotionEstimationIntraINTEL," +
            "SubgroupAvcMotionEstimationChromaINTEL," +
            "OpExtension,OpExtInstImport,OpExtInst," +
            "OpFunction,OpFunctionParameter,OpFunctionEnd," +
            "OpFunctionCall," +
            "OpNop,OpUndef,OpTypeReserveId,OpConstantTrue," +
            "OpConstantFalse,OpConstant,OpConstantComposite,OpConstantSampler," +
            "OpConstantNull,OpSpecConstantTrue,OpSpecConstantFalse,OpSpecConstant," +
            "OpSpecConstantComposite,OpSpecConstantOp,OpVariable,OpImageTexelPointer,OpLoad," +
            "OpStore,OpCopyMemory,OpCopyMemorySized,OpAccessChain,OpInBoundsAccessChain," +
            "OpPtrAccessChain,OpArrayLength,OpGenericPtrMemSemantics," +
            "OpInBoundsPtrAccessChain,OpVectorExtractDynamic,OpVectorInsertDynamic," +
            "OpVectorShuffle,OpCompositeConstruct,OpCompositeExtract,OpCompositeInsert," +
            "OpCopyObject,OpTranspose,OpSampledImage,OpImageSampleImplicitLod," +
            "OpImageSampleExplicitLod,OpImageSampleDrefImplicitLod," +
            "OpImageSampleDrefExplicitLod,OpImageSampleProjImplicitLod," +
            "OpImageSampleProjExplicitLod,OpImageSampleProjDrefImplicitLod," +
            "OpImageSampleProjDrefExplicitLod,OpImageFetch,OpImageGather,OpImageDrefGather," +
            "OpImageRead,OpImageWrite,OpImage,OpImageQueryFormat,OpImageQueryOrder," +
            "OpImageQuerySizeLod,OpImageQuerySize,OpImageQueryLod,OpImageQueryLevels," +
            "OpImageQuerySamples,OpConvertFToU,OpConvertFToS,OpConvertSToF,OpConvertUToF," +
            "OpUConvert,OpSConvert,OpFConvert,OpQuantizeToF16,OpConvertPtrToU," +
            "OpSatConvertSToU,OpSatConvertUToS,OpConvertUToPtr,OpPtrCastToGeneric," +
            "OpGenericCastToPtr,OpGenericCastToPtrExplicit,OpBitcast,OpISub,OpSRem," +
            "OpULessThan,OpSLessThan,OpULessThanEqual,OpSLessThanEqual,OpFUnordGreaterThan," +
            "OpFOrdLessThanEqual,OpFUnordLessThanEqual,OpFUnordGreaterThanEqual," +
            "OpEmitVertex,OpEndPrimitive,OpEmitStreamVertex,OpEndStreamPrimitive," +
            "OpControlBarrier,OpMemoryBarrier,OpAtomicLoad,OpAtomicStore,OpAtomicExchange," +
            "OpAtomicCompareExchange,OpAtomicCompareExchangeWeak,OpAtomicIIncrement," +
            "OpAtomicIDecrement,OpAtomicIAdd,OpAtomicISub,OpAtomicSMin,OpAtomicUMin," +
            "OpAtomicSMax,OpAtomicUMax,OpAtomicAnd,OpAtomicOr,OpAtomicXor,OpGroupAsyncCopy," +
            "OpGroupWaitEvents,OpGroupAll,OpGroupAny,OpGroupBroadcast,OpGroupIAdd," +
            "OpGroupFAdd,OpGroupFMin,OpGroupUMin,OpGroupSMin,OpGroupFMax,OpGroupUMax," +
            "OpGroupSMax,OpReadPipe,OpWritePipe,OpReservedReadPipe,OpReservedWritePipe," +
            "OpReserveReadPipePackets,OpReserveWritePipePackets,OpCommitReadPipe," +
            "OpCommitWritePipe,OpIsValidReserveId,OpGetNumPipePackets,OpGetMaxPipePackets," +
            "OpGroupReserveReadPipePackets,OpGroupReserveWritePipePackets," +
            "OpGroupCommitReadPipe,OpGroupCommitWritePipe,OpEnqueueMarker,OpEnqueueKernel," +
            "OpGetKernelNDrangeSubGroupCount,OpGetKernelNDrangeMaxSubGroupSize," +
            "OpGetKernelWorkGroupSize,OpGetKernelPreferredWorkGroupSizeMultiple," +
            "OpRetainEvent,OpReleaseEvent,OpCreateUserEvent,OpIsValidEvent," +
            "OpSetUserEventStatus,OpCaptureEventProfilingInfo,OpGetDefaultQueue," +
            "OpBuildNDRange,OpImageSparseSampleImplicitLod,OpImageSparseSampleExplicitLod," +
            "OpImageSparseSampleDrefImplicitLod,OpImageSparseSampleDrefExplicitLod," +
            "OpImageSparseSampleProjImplicitLod,OpImageSparseSampleProjExplicitLod," +
            "OpImageSparseSampleProjDrefImplicitLod,OpImageSparseSampleProjDrefExplicitLod," +
            "OpImageSparseFetch,OpImageSparseGather,OpImageSparseDrefGather," +
            "OpImageSparseTexelsResident,OpAtomicFlagTestAndSet,OpAtomicFlagClear," +
            "OpImageSparseRead,OpSizeOf,OpConstantPipeStorage,OpCreatePipeFromPipeStorage," +
            "OpGetKernelLocalSizeForSubgroupCount,OpGetKernelMaxNumSubgroups," +
            "OpNamedBarrierInitialize,OpMemoryNamedBarrier,OpExecutionModeId,OpDecorateId," +
            "OpGroupNonUniformElect,OpGroupNonUniformAll,OpGroupNonUniformAny," +
            "OpGroupNonUniformAllEqual,OpGroupNonUniformBroadcast," +
            "OpGroupNonUniformBroadcastFirst,OpGroupNonUniformBallot," +
            "OpGroupNonUniformInverseBallot,OpGroupNonUniformBallotBitExtract," +
            "OpGroupNonUniformBallotBitCount,OpGroupNonUniformBallotFindLSB," +
            "OpGroupNonUniformBallotFindMSB,OpGroupNonUniformShuffle," +
            "OpGroupNonUniformShuffleXor,OpGroupNonUniformShuffleUp," +
            "OpGroupNonUniformShuffleDown,OpGroupNonUniformIAdd,OpGroupNonUniformFAdd," +
            "OpGroupNonUniformIMul,OpGroupNonUniformFMul,OpGroupNonUniformSMin," +
            "OpGroupNonUniformUMin,OpGroupNonUniformFMin,OpGroupNonUniformSMax," +
            "OpGroupNonUniformUMax,OpGroupNonUniformFMax,OpGroupNonUniformBitwiseAnd," +
            "OpGroupNonUniformBitwiseOr,OpGroupNonUniformBitwiseXor," +
            "OpGroupNonUniformLogicalAnd,OpGroupNonUniformLogicalOr," +
            "OpGroupNonUniformLogicalXor,OpGroupNonUniformQuadBroadcast," +
            "OpGroupNonUniformQuadSwap,OpCopyLogical,OpPtrEqual,OpPtrNotEqual,OpPtrDiff," +
            "OpSubgroupBallotKHR,OpSubgroupFirstInvocationKHR,OpSubgroupAllKHR," +
            "OpSubgroupAnyKHR,OpSubgroupAllEqualKHR,OpSubgroupReadInvocationKHR," +
            "OpGroupIAddNonUniformAMD,OpGroupFAddNonUniformAMD,OpGroupFMinNonUniformAMD," +
            "OpGroupUMinNonUniformAMD,OpGroupSMinNonUniformAMD,OpGroupFMaxNonUniformAMD," +
            "OpGroupUMaxNonUniformAMD,OpGroupSMaxNonUniformAMD,OpFragmentMaskFetchAMD," +
            "OpFragmentFetchAMD,OpReadClockKHR,OpImageSampleFootprintNV," +
            "OpGroupNonUniformPartitionNV,OpWritePackedPrimitiveIndices4x8NV," +
            "OpReportIntersectionNV,OpIgnoreIntersectionNV,OpTerminateRayNV,OpTraceNV," +
            "OpTypeAccelerationStructureNV,OpExecuteCallableNV,OpTypeCooperativeMatrixNV," +
            "OpCooperativeMatrixLoadNV,OpCooperativeMatrixStoreNV," +
            "OpCooperativeMatrixMulAddNV,OpCooperativeMatrixLengthNV," +
            "OpBeginInvocationInterlockEXT,OpEndInvocationInterlockEXT," +
            "OpDemoteToHelperInvocationEXT,OpIsHelperInvocationEXT,OpSubgroupShuffleINTEL," +
            "OpSubgroupShuffleDownINTEL,OpSubgroupShuffleUpINTEL,OpSubgroupShuffleXorINTEL," +
            "OpSubgroupBlockReadINTEL,OpSubgroupBlockWriteINTEL," +
            "OpSubgroupImageBlockReadINTEL,OpSubgroupImageBlockWriteINTEL," +
            "OpSubgroupImageMediaBlockReadINTEL,OpSubgroupImageMediaBlockWriteINTEL," +
            "OpUCountLeadingZerosINTEL,OpUCountTrailingZerosINTEL,OpAbsISubINTEL," +
            "OpAbsUSubINTEL,OpIAddSatINTEL,OpUAddSatINTEL,OpIAverageINTEL,OpUAverageINTEL," +
            "OpIAverageRoundedINTEL,OpUAverageRoundedINTEL,OpISubSatINTEL,OpUSubSatINTEL," +
            "OpIMul32x16INTEL,OpUMul32x16INTEL,OpDecorateString,OpDecorateStringGOOGLE," +
            "OpMemberDecorateString,OpMemberDecorateStringGOOGLE,OpVmeImageINTEL," +
            "OpTypeVmeImageINTEL,OpTypeAvcImePayloadINTEL,OpTypeAvcRefPayloadINTEL," +
            "OpTypeAvcSicPayloadINTEL,OpTypeAvcMcePayloadINTEL,OpTypeAvcMceResultINTEL," +
            "OpTypeAvcImeResultINTEL,OpTypeAvcImeResultSingleReferenceStreamoutINTEL," +
            "OpTypeAvcImeResultDualReferenceStreamoutINTEL," +
            "OpTypeAvcImeSingleReferenceStreaminINTEL," +
            "OpTypeAvcImeDualReferenceStreaminINTEL,OpTypeAvcRefResultINTEL," +
            "OpTypeAvcSicResultINTEL," +
            "OpSubgroupAvcMceGetDefaultInterBaseMultiReferencePenaltyINTEL," +
            "OpSubgroupAvcMceSetInterBaseMultiReferencePenaltyINTEL," +
            "OpSubgroupAvcMceGetDefaultInterShapePenaltyINTEL," +
            "OpSubgroupAvcMceSetInterShapePenaltyINTEL," +
            "OpSubgroupAvcMceGetDefaultInterDirectionPenaltyINTEL," +
            "OpSubgroupAvcMceSetInterDirectionPenaltyINTEL," +
            "OpSubgroupAvcMceGetDefaultIntraLumaShapePenaltyINTEL," +
            "OpSubgroupAvcMceGetDefaultInterMotionVectorCostTableINTEL," +
            "OpSubgroupAvcMceGetDefaultHighPenaltyCostTableINTEL," +
            "OpSubgroupAvcMceGetDefaultMediumPenaltyCostTableINTEL," +
            "OpSubgroupAvcMceGetDefaultLowPenaltyCostTableINTEL," +
            "OpSubgroupAvcMceSetMotionVectorCostFunctionINTEL," +
            "OpSubgroupAvcMceGetDefaultIntraLumaModePenaltyINTEL," +
            "OpSubgroupAvcMceGetDefaultNonDcLumaIntraPenaltyINTEL," +
            "OpSubgroupAvcMceGetDefaultIntraChromaModeBasePenaltyINTEL," +
            "OpSubgroupAvcMceSetAcOnlyHaarINTEL," +
            "OpSubgroupAvcMceSetSourceInterlacedFieldPolarityINTEL," +
            "OpSubgroupAvcMceSetSingleReferenceInterlacedFieldPolarityINTEL," +
            "OpSubgroupAvcMceSetDualReferenceInterlacedFieldPolaritiesINTEL," +
            "OpSubgroupAvcMceConvertToImePayloadINTEL," +
            "OpSubgroupAvcMceConvertToImeResultINTEL," +
            "OpSubgroupAvcMceConvertToRefPayloadINTEL," +
            "OpSubgroupAvcMceConvertToRefResultINTEL," +
            "OpSubgroupAvcMceConvertToSicPayloadINTEL," +
            "OpSubgroupAvcMceConvertToSicResultINTEL,OpSubgroupAvcMceGetMotionVectorsINTEL," +
            "OpSubgroupAvcMceGetInterDistortionsINTEL," +
            "OpSubgroupAvcMceGetBestInterDistortionsINTEL," +
            "OpSubgroupAvcMceGetInterMajorShapeINTEL," +
            "OpSubgroupAvcMceGetInterMinorShapeINTEL," +
            "OpSubgroupAvcMceGetInterDirectionsINTEL," +
            "OpSubgroupAvcMceGetInterMotionVectorCountINTEL," +
            "OpSubgroupAvcMceGetInterReferenceIdsINTEL," +
            "OpSubgroupAvcMceGetInterReferenceInterlacedFieldPolaritiesINTEL," +
            "OpSubgroupAvcImeInitializeINTEL,OpSubgroupAvcImeSetSingleReferenceINTEL," +
            "OpSubgroupAvcImeSetDualReferenceINTEL,OpSubgroupAvcImeRefWindowSizeINTEL," +
            "OpSubgroupAvcImeAdjustRefOffsetINTEL,OpSubgroupAvcImeConvertToMcePayloadINTEL," +
            "OpSubgroupAvcImeSetMaxMotionVectorCountINTEL," +
            "OpSubgroupAvcImeSetUnidirectionalMixDisableINTEL," +
            "OpSubgroupAvcImeSetEarlySearchTerminationThresholdINTEL," +
            "OpSubgroupAvcImeSetWeightedSadINTEL," +
            "OpSubgroupAvcImeEvaluateWithSingleReferenceINTEL," +
            "OpSubgroupAvcImeEvaluateWithDualReferenceINTEL," +
            "OpSubgroupAvcImeEvaluateWithSingleReferenceStreaminINTEL," +
            "OpSubgroupAvcImeEvaluateWithDualReferenceStreaminINTEL," +
            "OpSubgroupAvcImeEvaluateWithSingleReferenceStreamoutINTEL," +
            "OpSubgroupAvcImeEvaluateWithDualReferenceStreamoutINTEL," +
            "OpSubgroupAvcImeEvaluateWithSingleReferenceStreaminoutINTEL," +
            "OpSubgroupAvcImeEvaluateWithDualReferenceStreaminoutINTEL," +
            "OpSubgroupAvcImeConvertToMceResultINTEL," +
            "OpSubgroupAvcImeGetSingleReferenceStreaminINTEL," +
            "OpSubgroupAvcImeGetDualReferenceStreaminINTEL," +
            "OpSubgroupAvcImeStripSingleReferenceStreamoutINTEL," +
            "OpSubgroupAvcImeStripDualReferenceStreamoutINTEL," +
            "OpSubgroupAvcImeGetStreamoutSingleReferenceMajorShapeMotionVectorsINTEL," +
            "OpSubgroupAvcImeGetStreamoutSingleReferenceMajorShapeDistortionsINTEL," +
            "OpSubgroupAvcImeGetStreamoutSingleReferenceMajorShapeReferenceIdsINTEL," +
            "OpSubgroupAvcImeGetStreamoutDualReferenceMajorShapeMotionVectorsINTEL," +
            "OpSubgroupAvcImeGetStreamoutDualReferenceMajorShapeDistortionsINTEL," +
            "OpSubgroupAvcImeGetStreamoutDualReferenceMajorShapeReferenceIdsINTEL," +
            "OpSubgroupAvcImeGetBorderReachedINTEL," +
            "OpSubgroupAvcImeGetTruncatedSearchIndicationINTEL," +
            "OpSubgroupAvcImeGetUnidirectionalEarlySearchTerminationINTEL," +
            "OpSubgroupAvcImeGetWeightingPatternMinimumMotionVectorINTEL," +
            "OpSubgroupAvcImeGetWeightingPatternMinimumDistortionINTEL," +
            "OpSubgroupAvcFmeInitializeINTEL,OpSubgroupAvcBmeInitializeINTEL," +
            "OpSubgroupAvcRefConvertToMcePayloadINTEL," +
            "OpSubgroupAvcRefSetBidirectionalMixDisableINTEL," +
            "OpSubgroupAvcRefSetBilinearFilterEnableINTEL," +
            "OpSubgroupAvcRefEvaluateWithSingleReferenceINTEL," +
            "OpSubgroupAvcRefEvaluateWithDualReferenceINTEL," +
            "OpSubgroupAvcRefEvaluateWithMultiReferenceINTEL," +
            "OpSubgroupAvcRefEvaluateWithMultiReferenceInterlacedINTEL," +
            "OpSubgroupAvcRefConvertToMceResultINTEL,OpSubgroupAvcSicInitializeINTEL," +
            "OpSubgroupAvcSicConfigureSkcINTEL,OpSubgroupAvcSicConfigureIpeLumaINTEL," +
            "OpSubgroupAvcSicConfigureIpeLumaChromaINTEL," +
            "OpSubgroupAvcSicGetMotionVectorMaskINTEL," +
            "OpSubgroupAvcSicConvertToMcePayloadINTEL," +
            "OpSubgroupAvcSicSetIntraLumaShapePenaltyINTEL," +
            "OpSubgroupAvcSicSetIntraLumaModeCostFunctionINTEL," +
            "OpSubgroupAvcSicSetIntraChromaModeCostFunctionINTEL," +
            "OpSubgroupAvcSicSetBilinearFilterEnableINTEL," +
            "OpSubgroupAvcSicSetSkcForwardTransformEnableINTEL," +
            "OpSubgroupAvcSicSetBlockBasedRawSkipSadINTEL,OpSubgroupAvcSicEvaluateIpeINTEL," +
            "OpSubgroupAvcSicEvaluateWithSingleReferenceINTEL," +
            "OpSubgroupAvcSicEvaluateWithDualReferenceINTEL," +
            "OpSubgroupAvcSicEvaluateWithMultiReferenceINTEL," +
            "OpSubgroupAvcSicEvaluateWithMultiReferenceInterlacedINTEL," +
            "OpSubgroupAvcSicConvertToMceResultINTEL,OpSubgroupAvcSicGetIpeLumaShapeINTEL," +
            "OpSubgroupAvcSicGetBestIpeLumaDistortionINTEL," +
            "OpSubgroupAvcSicGetBestIpeChromaDistortionINTEL," +
            "OpSubgroupAvcSicGetPackedIpeLumaModesINTEL," +
            "OpSubgroupAvcSicGetIpeChromaModeINTEL," +
            "OpSubgroupAvcSicGetPackedSkcLumaCountThresholdINTEL," +
            "OpSubgroupAvcSicGetPackedSkcLumaSumThresholdINTEL," +
            "OpSubgroupAvcSicGetInterRawSadsINTEL," +
            "OpLabel," +
            "OpLoopMerge," +
            "OpMemoryModel,OpEntryPoint,OpExecutionMode,OpCapability," +
            "OpDecorate,OpMemberDecorate,OpGroupDecorate,OpGroupMemberDecorate," +
            "OpDecorationGroup," +
            "OpSNegate,OpFNegate,OpIAdd,OpFAdd,OpFSub,OpFSub," +
            "OpIMul,OpFMul,OpUDiv,OpSDiv,OpFDiv,OpUMod,OpSMod,OpFMod,OpFRem,OpFRem," +
            "OpVectorTimesScalar,OpMatrixTimesScalar,OpVectorTimesMatrix," +
            "OpMatrixTimesVector,OpMatrixTimesMatrix,OpOuterProduct,OpDot,OpIAddCarry," +
            "OpISubBorrow,OpUMulExtended,OpSMulExtended,OpShiftRight,OpShiftRightLogical," +
            "OpShiftRightArithmetic,OpShiftLeftLogical,OpBitwiseOr,OpBitwiseXor," +
            "OpBitwiseAnd,OpNot,OpBitFieldInsert,OpBitFieldSExtract,OpBitFieldUExtract," +
            "OpBitReverse,OpBitCount,OpAny,OpAll,OpIsNan,OpIsInf,OpIsFinite,OpIsNormal," +
            "OpSignBitSet,OpLessOrGreater,OpOrdered,OpUnordered,OpLogicalEqual," +
            "OpLogicalNotEqual,OpLogicalOr,OpLogicalAnd,OpLogicalNot,OpSelect,OpIEqual," +
            "OpINotEqual,OpUGreaterThan,OpUGreaterThanEqual,OpSGreaterThan," +
            "OpSGreaterThanEqual,OpFOrdEqual,OpFOrdNotEqual,OpFUnordNotEqual,OpFUnordEqual," +
            "OpFOrdLessThan,OpFUnordLessThan,OpFOrdGreaterThan,OpFOrdGreaterThanEqual," +
            "OpFUnordGraterThan,OpFUnordGraterThanEqual,OpDPdx,OpDPdy,OpFwidth,OpDPdxFine," +
            "OpDPdyFine,OpFwidthFine,OpDPdxCoarse,OpDPdyCoarse,OpFwidthCoarse," +
            "OpTypeVoid,OpTypeBool,OpTypeInt,OpTypeFloat,OpTypeVector," +
            "OpTypeMatrix,OpTypeImage,OpTypeSampler,OpTypeSampledImage,OpTypeArray," +
            "OpTypeRuntimeArray,OpTypeStruct,OpTypeOpaque,OpTypePointer,OpTypeFunction," +
            "OpTypeEvent,OpTypeDeviceEvent,OpTypeReservedId,OpTypeQueue,OpTypePipe," +
            "OpTypeForwardPointer,OpTypePipeStorage,OpTypeNamedBarrier," +
            "DebugInfoNone,DebugCompilationUnit,DebugTypeBasic," +
            "DebugTypePointer,DebugTypeQualifier,DebugTypeArray,DebugTypeVector," +
            "DebugTypedef,DebugTypeFunction,DebugTypeEnum,DebugTypeComposite," +
            "DebugTypeMember,DebugTypeInheritance,DebugTypePtrToMember,DebugTypeTemplate," +
            "DebugTypeTemplateParameter,DebugTypeTemplateTemplateParameter," +
            "DebugTypeTemplateParameterPack,DebugGlobalVariable,DebugFunctionDeclaration," +
            "DebugFunction,DebugLexicalBlock,DebugLexicalBlockDiscriminator,DebugScope," +
            "DebugNoScope,DebugInlinedAt,DebugLocalVariable,DebugInlinedVariable," +
            "DebugDeclare,DebugValue,DebugOperation,DebugExpression,DebugMacroDef," +
            "DebugMacroUndef,FlagIsProtected,FlagIsPrivate,FlagIsPublic,FlagIsLocal," +
            "FlagIsDefinition,FlagFwdDecl,FlagArtificial,FlagExplicit,FlagPrototyped," +
            "FlagObjectPointer,FlagStaticMember,FlagIndirectVariable,FlagLValueReference," +
            "FlagRValueReference,FlagIsOptimized,Unspecified,Address,Boolean,Float,Signed," +
            "SignedChar,Unsigned,UnsignedChar,Class,Structure,Union,ConstType,VolatileType," +
            "RestrictType,Deref,Plus,Minus,PlusUconst,BitPiece,Swap,Xderef,StackValue," +
            "Constu," +
            "Round,RoundEven,Trunc,FAbs,SAbs,FSign,SSign,Floor," +
            "Ceil,Fract,Radians,Degrees,Sin,Cos,Tan,Asin,Acos,Atan,Sinh,Cosh,Tanh,Asinh," +
            "Acosh,Atanh,Atan2,Pow,Exp,Log,Exp2,Log2,Sqrt,InverseSqrt,Determinant," +
            "MatrixInverse,Modf,ModfStruct,FMin,UMin,SMin,FMax,UMax,SMax,FClamp,UClamp," +
            "SClamp,FMix,IMix,Step,SmoothStep,Fma,Frexp,FrexpStruct,Ldexp,PackSnorm4x8," +
            "PackUnorm4x8,PackSnorm2x16,PackUnorm2x16,PackHalf2x16,PackDouble2x32," +
            "UnpackSnorm2x16,UnpackUnorm2x16,UnpackHalf2x16,UnpackSnorm4x8,UnpackUnorm4x8," +
            "UnpackDouble2x32,Length,Distance,Cross,Normalize,FaceForward,Reflect,Refract," +
            "FindILsb,FindSMsb,FindUMsb,InterpolateAtCentroid,InterpolateAtSample," +
            "InterpolateAtOffset,NMin,NMax,NClamp," +
            "acos,acosh,acospi,asin,asinh,asinpi,atan,atan2," +
            "atanh,atanpi,atan2pi,cbrt,ceil,copysign,cos,cosh,cospi,erfc,erf,exp,exp2,exp10," +
            "expm1,fabs,fdim,floor,fma,fmax,fmin,fmod,fract,frexp,hypot,ilogb,ldexp,lgamma," +
            "lgamma_r,log,log2,log10,log1p,logb,mad,maxmag,minmag,modf,nan,nextafter,pow," +
            "pown,powr,remainder,remquo,rint,rootn,round,rsqrt,sin,sincos,sinh,sinpi,sqrt," +
            "tan,tanh,tanpi,tgamma,trunc,half_cos,half_divide,half_exp,half_exp2,half_exp10," +
            "half_log,half_log2,half_log10,half_powr,half_recip,half_rsqrt,half_sin," +
            "half_sqrt,half_tan,native_cos,native_divide,native_exp,native_exp2," +
            "native_exp10,native_log,native_log2,native_log10,native_powr,native_recip," +
            "native_rsqrt,native_sin,native_sqrt,native_tan,s_abs,s_abs_diff,s_add_sat," +
            "u_add_sat,s_hadd,u_hadd,s_rhadd,u_rhadd,s_clamp,u_clamp,clz,ctz,s_mad_hi," +
            "u_mad_sat,s_mad_sat,s_max,u_max,s_min,u_min,s_mul_hi,rotate,s_sub_sat," +
            "u_sub_sat,u_upsample,s_upsample,popcount,s_mad24,u_mad24,s_mul24,u_mul24,u_abs," +
            "u_abs_diff,u_mul_hi,u_mad_hi,fclamp,degrees,fmax_common,fmin_common,mix," +
            "radians,step,smoothstep,sign,cross,distance,length,normalize,fast_distance," +
            "fast_length,fast_normalize,bitselect,select,vloadn,vstoren,vload_half," +
            "vload_halfn,vstore_half,vstore_half_r,vstore_halfn,vstore_halfn_r,vloada_halfn," +
            "vstorea_halfn,vstorea_halfn_r,shuffle,shuffle2,printf,prefetch".split(',');

        var typeKeywords = "void,half,float,double,x86_fp80,fp128,ppc_fp128,label,metadata,x86_mmx".split(',');

        var numberStart = /[\d\.]/;
        var number = /^(?:0x[a-f\d]+|0b[01]+|(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(u|ll?|l|f)?/i;

        function isAlnum(ch) {
            return ('a' <= ch && ch <= 'z') || ('A' <= ch && ch <= 'Z') || ('0' <= ch && ch <= '9');
        }

        function isInteger(str) {
            var n = Math.floor(Number(str));
            return String(n) === str && n >= 0;
        }

        var isPunctuationChar = /[\[\]{}\(\),;\:\.]/;

        // Interface

        return {
            token: function (stream) {
                if (stream.eatSpace()) return null;
                var ch = stream.next();
                if (ch == ';') {
                    stream.skipToEnd();
                    return "comment";
                }
                if (ch == '/' && stream.peek() == '/') {
                    stream.skipToEnd();
                    return "comment";
                }
                if (ch == '"' || ch == "'") {
                    return tokenString(ch)(stream);
                }
                if (ch == '%') {
                    stream.eatWhile(/[\w\$\.]/);
                    return "variable-2";
                }
                if (isPunctuationChar.test(ch)) {
                    return null;
                }
                if (numberStart.test(ch)) {
                    stream.backUp(1)
                    if (stream.match(number)) return "number"
                    stream.next()
                }

                stream.eatWhile(/[\w\$_\xa1-\uffff]/);
                var cur = stream.current();
                if (keywords.indexOf(cur) !== -1) {
                    return "keyword";
                }
                if (typeKeywords.indexOf(cur) !== -1) {
                    return "variable-3";
                }
                if (cur.charAt(0) == 'i' && isInteger(cur.substring(1))) {
                    return "variable-3";
                }
                return "word";
            }
        };
    });

    CodeMirror.defineMIME("text/x-spirv", "spirv");
});