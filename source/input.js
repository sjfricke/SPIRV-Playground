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
    var localTool = localStorage.getItem('tool');
    var startingTool = (localTool) ? localTool : tools[0];
    setSavedValues(startingTool);

    // Wait until everything is set to re-run on load
    document.getElementById('selectTool').onchange = function(element) {
        setSavedValues(element.target.value);
    };
}

function setSavedValues(tool) {
    var localSource = localStorage.getItem('source-' + tool);
    var localFlags = localStorage.getItem('flags-' + tool);

    document.getElementById('selectTool').value = tool;

    if (localSource) {
        $('#disassembleDiv')[0].innerHTML = spirvTextToHtml(localSource);
    } else {
        $('#disassembleDiv')[0].innerHTML = spirvTextToHtml(defaultSource(tool));
    }
    if (localFlags) {
        document.getElementById('commandFlags').value = localFlags;
    } else {
        document.getElementById('commandFlags').value = defaultFlags(tool);
    }
}

$('#copyToClipboard').on('click', function() {
    let clipboard = document.getElementById('resultText').innerText;
    if (clipboard.length != 0) {
        navigator.clipboard.writeText(document.getElementById('resultText').innerText);
        document.getElementById('alertBox').innerHTML = 'copied to clipborad!';
    } else {
        document.getElementById('alertBox').innerHTML = 'no text to copy!';
    }
    document.getElementById('alertBox').style.display = 'block';
    setTimeout(function() {
        document.getElementById('alertBox').style.display = 'none';
    }, 1000);
});