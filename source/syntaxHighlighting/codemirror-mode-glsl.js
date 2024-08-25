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

    function words(str) {
        var obj = {}, words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }
    function contains(words, word) {
        if (typeof words === "function") {
            return words(word);
        } else {
            return words.propertyIsEnumerable(word);
        }
    }

    function cppHook(stream, state) {
        if (!state.startOfLine) return false
        for (var ch, next = null; ch = stream.peek();) {
            if (ch == "\\" && stream.match(/^.$/)) {
                next = cppHook
                break
            } else if (ch == "/" && stream.match(/^\/[\/\*]/, false)) {
                break
            }
            stream.next()
        }
        state.tokenize = next
        return "meta"
    }

    function def(mimes, mode) {
        if (typeof mimes == "string") mimes = [mimes];
        var words = [];
        function add(obj) {
            if (obj) for (var prop in obj) if (obj.hasOwnProperty(prop))
                words.push(prop);
        }
        add(mode.keywords);
        add(mode.types);
        add(mode.builtin);
        add(mode.atoms);
        if (words.length) {
            mode.helperType = mimes[0];
            CodeMirror.registerHelper("hintWords", mimes[0], words);
        }

        for (var i = 0; i < mimes.length; ++i)
            CodeMirror.defineMIME(mimes[i], mode);
    }

    def(["x-shader/glsl"], {
        name: "clike",
        keywords: words("attribute const uniform varying break continue " +
            "lowp mediump highp precision invariant discard return " +
            "layout location flat centroid sample noperspective " +
            "in out inout"),
        types: words("float int void bool mat2 mat3 mat4 vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 sampler2D"),
        blockKeywords: words("for while do if else struct"),
        builtin: words("radians degrees sin cos tan asin acos atan pow " +
            "exp log exp2 log2 sqrt inversesqrt abs sign floor ceil fract mod " +
            "min max clamp mix step smoothstep length distance dot cross " +
            "normalize faceforward reflect refract matrixCompMult lessThan " +
            "lessThanEqual greaterThan greaterThanEqual equal notEqual any all " +
            "not dFdx dFdy fwidth texture2D texture2DProj texture2DLod " +
            "texture2DProjLod textureCube textureCubeLod require export"),
        atoms: words("true false " +
            "gl_FragColor gl_SecondaryColor gl_Normal gl_Vertex " +
            "gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 gl_MultiTexCoord3 " +
            "gl_MultiTexCoord4 gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 " +
            "gl_FogCoord gl_PointCoord " +
            "gl_Position gl_PointSize gl_ClipVertex " +
            "gl_FrontColor gl_BackColor gl_FrontSecondaryColor gl_BackSecondaryColor " +
            "gl_TexCoord gl_FogFragCoord " +
            "gl_FragCoord gl_FrontFacing " +
            "gl_FragData gl_FragDepth " +
            "gl_ModelViewMatrix gl_ProjectionMatrix gl_ModelViewProjectionMatrix " +
            "gl_TextureMatrix gl_NormalMatrix gl_ModelViewMatrixInverse " +
            "gl_ProjectionMatrixInverse gl_ModelViewProjectionMatrixInverse " +
            "gl_TexureMatrixTranspose gl_ModelViewMatrixInverseTranspose " +
            "gl_ProjectionMatrixInverseTranspose " +
            "gl_ModelViewProjectionMatrixInverseTranspose " +
            "gl_TextureMatrixInverseTranspose " +
            "gl_NormalScale gl_DepthRange gl_ClipPlane " +
            "gl_Point gl_FrontMaterial gl_BackMaterial gl_LightSource gl_LightModel " +
            "gl_FrontLightModelProduct gl_BackLightModelProduct " +
            "gl_TextureColor gl_EyePlaneS gl_EyePlaneT gl_EyePlaneR gl_EyePlaneQ " +
            "gl_FogParameters " +
            "gl_MaxLights gl_MaxClipPlanes gl_MaxTextureUnits gl_MaxTextureCoords " +
            "gl_MaxVertexAttribs gl_MaxVertexUniformComponents gl_MaxVaryingFloats " +
            "gl_MaxVertexTextureImageUnits gl_MaxTextureImageUnits " +
            "gl_MaxFragmentUniformComponents gl_MaxCombineTextureImageUnits " +
            "gl_MaxDrawBuffers"),
        indentSwitch: false,
        hooks: { "#": cppHook },
        modeProps: { fold: ["brace", "include"] }
    });

});