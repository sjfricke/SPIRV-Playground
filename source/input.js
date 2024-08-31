function commandFlagsEnter(event) {
    if (event.which === 13) {  // Enter
        event.preventDefault();
        evaluateInputSource();
    }
}

function loadKeyHooks() {
    inputEditor.setOption('extraKeys', {
        Enter: function() {
            evaluateInputSource();
        }
    });

    $('#commandFlags').on('keypress', commandFlagsEnter);
    $('#commandFlags2').on('keypress', commandFlagsEnter);
    $('#commandFlags3').on('keypress', commandFlagsEnter);

    // inputEditor.on('change', function() {})
};

async function loadTools() {
    const response = await fetch("getTools", {method: 'GET'});
    const tools = await response.json();

    for (let i = 0; i < document.getElementsByClassName('toolOptions').length; i++) {
        let select = document.getElementsByClassName('toolOptions')[i];
        for (let k = 0; k < tools.length; k++) {
            let option = document.createElement('option');
            option.text = option.value = tools[k];
            select.appendChild(option);
        }
    }

    // Load previous settings of working run
    let localTool = localStorage.getItem('tool');
    let startingTool = (localTool) ? localTool : tools[0];
    setSavedValues(startingTool);

    let localTool2 = localStorage.getItem('tool2');
    let startingTool2 = (localTool2) ? localTool2 : 'spirv-opt';
    setSavedValues2(startingTool2);

    let localTool3 = localStorage.getItem('tool3');
    let startingTool3 = (localTool3) ? localTool3 : 'spirv-cross';
    setSavedValues3(startingTool3);

    // Set on first time
    inputEditor.setOption('mode', getSyntaxHighlighting(startingTool));

    // Wait until everything is set to re-run on load
    document.getElementById('selectTool').onchange = function(element) {
        setSavedValues(element.target.value);
        inputEditor.setOption('mode', getSyntaxHighlighting(element.target.value));
    };
    document.getElementById('selectTool2').onchange = function(element) {
        setSavedValues2(element.target.value);
    };
    document.getElementById('selectTool3').onchange = function(element) {
        setSavedValues3(element.target.value);
    };
}

function setSavedValues(tool) {
    // To set on init
    document.getElementById('selectTool').value = tool;

    let localSource = localStorage.getItem('source-' + tool);
    let localFlags = localStorage.getItem('flags-' + tool);

    inputEditor.setValue(localSource ? localSource : defaultSource(tool));
    document.getElementById('commandFlags').value = localFlags ? localFlags : defaultFlags(tool);
}

function setSavedValues2(tool) {
    // To set on init
    document.getElementById('selectTool2').value = tool;

    let localFlags = localStorage.getItem('flags2-' + tool);
    document.getElementById('commandFlags2').value = localFlags ? localFlags : defaultFlags(tool);
}

function setSavedValues3(tool) {
    // To set on init
    document.getElementById('selectTool3').value = tool;

    let localFlags = localStorage.getItem('flags3-' + tool);
    document.getElementById('commandFlags3').value = localFlags ? localFlags : defaultFlags(tool);
}

$('#copyToClipboard').on('click', function() {
    let clipboard = outputEditor.getValue();
    if (clipboard.length != 0) {
        navigator.clipboard.writeText(clipboard);
        setAlertBox('copied to clipborad!', 2000);
    } else {
        setAlertBox('no text to copy!', 2000);
    }
});

function getSyntaxHighlighting(tool) {
    if (tool == 'glslangValidator') {
        return 'x-shader/glsl'
    } else if (tool == 'dxc') {
        return 'x-shader/hlsl'
    } else if (tool == 'slangc') {
        return 'x-shader/hlsl'
    } else {
        return 'text/x-spirv'
    }
}

$('#clearCache').on('click', function() {
    localStorage.clear();
    setAlertBox('Cache is cleared', 2000);
});

function setFontSize(px) {
    $('.CodeMirror').css('fontSize', px + 'px');
    localStorage.setItem('editorFontSize', px);
}

$('#largerText').on('click', function() {
    editorFontSize++;
    setFontSize(editorFontSize);
});

$('#smallerText').on('click', function() {
    editorFontSize--;
    setFontSize(editorFontSize);
});

// Load in file
async function fileSelected(data, filename) {
    if (data == undefined) {
        alert('Error: Failed to read in file ' + filename);
        return;
    }

    var spirvHeader = new Uint32Array(data, 0, 1);
    // if SPIR-V file, get dissembly, else it is source HLL file
    if (spirvHeader[0] == spirv.Meta.MagicNumber) {
        const requestSettings = {method: 'POST', headers: {'Content-Type': ' application/octet-stream'}, body: data};
        const response = await fetch('dissemble', requestSettings).catch((error) => {
            setAlertBox(error, 4000);
        });

        const dissembly = await response.json();
        if (dissembly.success) {
            inputEditor.setValue(dissembly.data);
        } else {
            setAlertBox('Error: ' + dissembly.data, 4000);
        }
    } else {
        // Couldn't find a good way to check if the incoming file was just text, so convert back from an ArrayBuffer
        let decoder = new TextDecoder('utf-8');
        inputEditor.setValue(decoder.decode(data));
    }
}

const fileSelector = document.getElementById('fileSelector');
function fileSelect(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const filename = (event.target.files) ? event.target.files[0].name : undefined;
        fileSelected(reader.result, filename);
    };
    reader.readAsArrayBuffer(event.target.files[0]);
};
fileSelector.addEventListener('change', fileSelect, false);

// Assume single file
function dropHandler(event) {
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    var file;
    if (event.dataTransfer.items) {
        // DataTransferItemList interface
        assert(event.dataTransfer.items[0].kind === 'file', 'Can only load single files');
        file = event.dataTransfer.items[0].getAsFile();
    } else {
        // DataTransfer interface
        file = event.dataTransfer.files[0];
    }
    const reader = new FileReader();
    reader.onload = function() {
        const filename = (file) ? file.name : undefined;
        fileSelected(reader.result, filename);
    };
    reader.readAsArrayBuffer(file);
}
const dropArea = document.getElementsByTagName('BODY')[0];
dropArea.addEventListener('drop', dropHandler, false);
dropArea.addEventListener('dragover', dragOverHandler, false);

// This is needed or else the browser will try to download files
function dragOverHandler(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';  // Explicitly show this is a copy.
}

// TODO - improve this CSS hacking
function loadPipelines() {
    $('.mainColumn')[0].style.height = '93vh';
    $('.mainColumn')[1].style.height = '93vh';
    $('#moduleData')[0].style.marginTop = '6vh';
    $('#pipeline2')[0].style.display = 'none';
    $('#pipeline3')[0].style.display = 'none';
}

$('#AddPipeline2').on('click', function() {
    $('.mainColumn')[0].style.height = '91vh';
    $('.mainColumn')[1].style.height = '91vh';
    $('#moduleData')[0].style.marginTop = '8vh';
    $('#pipeline2')[0].style.display = 'block';
    $('#pipeline3')[0].style.display = 'none';
});

$('#AddPipeline3').on('click', function() {
    $('.mainColumn')[0].style.height = '89vh';
    $('.mainColumn')[1].style.height = '89vh';
    $('#moduleData')[0].style.marginTop = '10vh';
    $('#pipeline2')[0].style.display = 'block';
    $('#pipeline3')[0].style.display = 'block';
});

$('#RemovePipeline2').on('click', function() {
    $('.mainColumn')[0].style.height = '93vh';
    $('.mainColumn')[1].style.height = '93vh';
    $('#moduleData')[0].style.marginTop = '6vh';
    $('#pipeline2')[0].style.display = 'none';
    $('#pipeline3')[0].style.display = 'none';
});

$('#RemovePipeline3').on('click', function() {
    $('.mainColumn')[0].style.height = '91vh';
    $('.mainColumn')[1].style.height = '91vh';
    $('#moduleData')[0].style.marginTop = '8vh';
    $('#pipeline2')[0].style.display = 'block';
    $('#pipeline3')[0].style.display = 'none';
});