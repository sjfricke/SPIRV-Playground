'use strict';
const express = require('express');
const fs = require('fs');
const tmp = require('tmp');
const hasbin = require('hasbin');
const commander = require('commander');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)
const app = express()
const port = 9000

const program = new commander.Command();
program.option('--dxc <path>', 'Set path to dxc.exe you want to use (default - find in path).')
    .option('--glslangValidator <path>', 'Set path to glslangValidator.exe you want to use (default - find in path).')
    .option('--slangc <path>', 'Set path to slangc.exe you want to use (default - find in path).')
    .option('--SPIRV-Tools <path>', 'Set path to binaries from SPIRV-Tools you want to use (default - find in path).')
    .parse(process.argv);


app.use(express.static('.'))
// SPIR-V disassembly is get very large
app.use(express.json({limit: '50mb'}));

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/index.html`);
})

var allTools =
    {
        'dxc': {
            'found': false,
            'exe': 'dxc',  // default
            'repo': 'DirectXShaderCompiler',
            'public': true
        },
        'glslangValidator': {
            'found': false,
            'exe': 'glslangValidator',  // default
            'repo': 'glslang',
            'public': true
        },
        'slangc': {
            'found': false,
            'exe': 'slangc',  // default
            'repo': 'slang',
            'public': true
        },
        'spirv-cross': {
            'found': false,
            'exe': 'spirv-cross',  // default
            'repo': 'SPIRV-Cross',
            'public': true
        },
        'spirv-val': {
            'found': false,
            'exe': 'spirv-val',  // default
            'repo': 'SPIRV-Tools',
            'public': true
        },
        'spirv-opt': {
            'found': false,
            'exe': 'spirv-opt',  // default
            'repo': 'SPIRV-Tools',
            'public': true
        },
        'spirv-as': {
            'found': false,
            'exe': 'spirv-opt',  // default
            'repo': 'SPIRV-Tools',
            'public': false
        },
        'spirv-dis': {
            'found': false,
            'exe': 'spirv-opt',  // default
            'repo': 'SPIRV-Tools',
            'public': false
        },
    }

    function SetUpTools() {
        const options = program.opts();
        for (const tool in allTools) {
            if (allTools[tool].repo == 'SPIRV-Tools' && options['SPIRVTools']) {
                allTools[tool]['exe'] = options['SPIRVTools'] + tool
                allTools[tool]['found'] = true;
            } else if (options[tool]) {
                allTools[tool]["exe"] = options[tool]
                allTools[tool]['found'] = true;
            } else if (hasbin.sync(tool)) {
                allTools[tool]['found'] = true;  // use default exe
            } else {
                console.log(`WARNING - could not find ${tool} in your path`)
            }
        }
    }

    app.get('/getTools', async (req, res) => {
        var availableTools = [];
        for (const tool in allTools) {
            if (allTools[tool]['public'] && allTools[tool]['found']) {
                availableTools.push(tool)
            }
        }
        res.send(availableTools);
    })

// Create a single temp file used every time
const sourceFile = tmp.fileSync();

const spirvInputTools = [
    'spirv-val',
    'spirv-opt',
    'spirv-cross',
];

// This is a mess because spirv-opt needs the '=' when setting it but things like spirv-as needs it without the '='
function getSpirvTargetEnv(flags) {
    // TODO - this whole string logic could be better or just have the user send down the version as separate arg
    const flagArray = flags.split(' ');
    if (flagArray.indexOf('--target-env') != -1) {
        return `--target-env ${flagArray[flagArray.indexOf('--target-env') + 1]}`;
    }
    for (var i in flagArray) {
        if (flagArray[i].indexOf('--target-env=') == 0) {
            return `--target-env ${flagArray[i].substr(13)}`;
        }
    }
    return '';
}

app.post('/compile', async (req, res) => {
    var result = {
        'success': true,
        'error': {
            'cmd': '',
            'stdout': '',
            'stderr': '',
        },
        'output': ''
    };

    fs.writeFileSync(sourceFile.name, req.body.source);

    // If input is disassembled SPIR-V, turn to binary first
    if (spirvInputTools.includes(req.body.tool)) {
        const spirvTargetEnv = getSpirvTargetEnv(req.body.flags)
        try {
            // Just override temp file, no need to keep original disassembly
            const asCommand = `${allTools['spirv-as']['exe']} ${sourceFile.name} -o ${sourceFile.name} ${spirvTargetEnv}`;
            console.log(asCommand + '\n');
            await exec(asCommand);
        } catch (error) {
            result.success = false
            result.error.cmd = error.cmd;
            result.error.stdout = error.stdout;
            result.error.stderr = error.stderr;
            res.send(result);
            return;
        }
    }

    if (req.body.tool == 'spirv-opt') {
        // spirv-opt needs the '=' between
        req.body.flags = req.body.flags.replace(/--target-env\s+(\S+)/g, '--target-env=$1');
    }

    // spirv-opt only outputs the binary
    // glslang outputs a dissembly not always recognized
    const needsDissembling = req.body.tool == 'glslangValidator' || req.body.tool == 'spirv-opt';

    var exe = allTools[req.body.tool]['exe'];
    var command = `${exe} ${req.body.flags} ${sourceFile.name}`;
    if (needsDissembling) {
        command += ` -o ${sourceFile.name}`
    }

    // print command to allow people to copy and use it elsewhere
    console.log(command + '\n');

    try {
        result.output = (await exec(command)).stdout;
    } catch (error) {
        result.success = false
        result.error.cmd = error.cmd;
        result.error.stdout = error.stdout;
        result.error.stderr = error.stderr;
    }

    if (result.success && needsDissembling) {
        // need to get out to spirv
        const disCommand = `${allTools['spirv-dis']['exe']} ${sourceFile.name}`;
        console.log(disCommand + '\n');
        result.output = (await exec(disCommand)).stdout;
    }

    res.send(result);
})

app.post('/dissemble', async (req, res) => {
    const buffer = await new Promise((resolve, reject) => {
        let data = [];

        req.on('data', chunk => {
            data.push(chunk);
        });

        req.on('end', () => {
            // Concatenate the collected data chunks
            const buffer = Buffer.concat(data);
            resolve(buffer);
        });

        req.on('error', (err) => {
            reject(err);
        });
    });

    fs.writeFileSync(sourceFile.name, buffer);

    // Process the buffer or save it as a file
    var result = {'success': true, 'data': 'could not dissemble SPIR-V'};

    const disCommand = `${allTools['spirv-dis']['exe']} ${sourceFile.name}`;
    console.log(disCommand + '\n');

    try {
        result.data = (await exec(disCommand)).stdout;
    } catch (error) {
        result.success = false
        result.data = error.stderr;
    }

    res.send(result);
})


app.listen(port, () => {
    SetUpTools();
    console.log(`\nSPIRV-Playground is live at http://localhost:${port}`);
    console.log(`-------------------------------------------------\n`);
})

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
function shutDown() {
    sourceFile.removeCallback();
    process.exit(0);
}
