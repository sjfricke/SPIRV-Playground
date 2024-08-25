function loadKeyHooks() {
    inputEditor.setOption('extraKeys', {
        Enter: function() {
            evaluateInputSource();
        }
    });

    $('#commandFlags').on('keypress', function(event) {
        if (event.which === 13) {  // Enter
            event.preventDefault();
            evaluateInputSource();
        }
    });

    // inputEditor.on('change', function() {})
};

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
    var localTool = localStorage.getItem('tool');
    var startingTool = (localTool) ? localTool : tools[0];
    setSavedValues(startingTool);
    // Set on first time
    inputEditor.setOption('mode', getSyntaxHighlighting(startingTool));

    // Wait until everything is set to re-run on load
    document.getElementById('selectTool').onchange = function(element) {
        setSavedValues(element.target.value);
        inputEditor.setOption('mode', getSyntaxHighlighting(element.target.value));
    };
}

function setSavedValues(tool) {
    var localSource = localStorage.getItem('source-' + tool);
    var localFlags = localStorage.getItem('flags-' + tool);

    document.getElementById('selectTool').value = tool;

    inputEditor.setValue(localSource ? localSource : defaultSource(tool));
    document.getElementById('commandFlags').value = localFlags ? localFlags : defaultFlags(tool);
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