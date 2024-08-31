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
    // Tools that might be less mainstream (aka, won't be found in the SDK)
    .option('--gpuav <path>', 'Set path to binaries from GPU-AV Shader instrumentation offline tool.')
    .parse(process.argv);


app.use(express.static('.'))
// SPIR-V disassembly is get very large
app.use(express.json({limit: '50mb'}));

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/index.html`);
})

var allTools = {
    'dxc': {
        'name': 'dxc',
        'found': false,
        'exe': 'dxc',  // default
        'repo': 'DirectXShaderCompiler',
        'input': 'text',
        'output': 'text',
        'public': true
    },
    'glslangValidator': {
        'name': 'glslangValidator',
        'found': false,
        'exe': 'glslangValidator',  // default
        'repo': 'glslang',
        'input': 'text',
        'output': 'spirv',  // glslang outputs a dissembly not always recognized
        'public': true
    },
    'slangc': {
        'name': 'slangc',
        'found': false,
        'exe': 'slangc',  // default
        'repo': 'slang',
        'input': 'text',
        'output': 'text',
        'public': true
    },
    'spirv-cross': {
        'name': 'spirv-cross',
        'found': false,
        'exe': 'spirv-cross',  // default
        'repo': 'SPIRV-Cross',
        'input': 'spirv',
        'output': 'text',
        'public': true
    },
    'spirv-val': {
        'name': 'spirv-val',
        'found': false,
        'exe': 'spirv-val',  // default
        'repo': 'SPIRV-Tools',
        'input': 'spirv',
        'output': 'status',
        'public': true
    },
    'spirv-opt': {
        'name': 'spirv-opt',
        'found': false,
        'exe': 'spirv-opt',  // default
        'repo': 'SPIRV-Tools',
        'input': 'spirv',
        'output': 'spirv',
        'public': true
    },
    'spirv-as': {
        'name': 'spirv-as',
        'found': false,
        'exe': 'spirv-as',  // default
        'repo': 'SPIRV-Tools',
        'input': 'text',
        'output': 'spirv',
        'public': false
    },
    'spirv-dis': {
        'name': 'spirv-dis',
        'found': false,
        'exe': 'spirv-dis',  // default
        'repo': 'SPIRV-Tools',
        'input': 'spirv',
        'output': 'text',
        'public': false
    },
    'gpuav': {
        'name': 'gpuav',
        'found': false,
        'exe': '',  // no default
        'repo': 'Vulkan-ValidaitonLayers',
        'input': 'spirv',
        'output': 'spirv',
        'public': true
    },
};

function SetUpTools() {
    const options = program.opts();
    for (const tool in allTools) {
        var item = allTools[tool];
        if (item.repo == 'SPIRV-Tools' && options['SPIRVTools']) {
            item.exe = options['SPIRVTools'] + tool
            item.found = true;
        } else if (options[tool]) {
            item.exe = options[tool]
            item.found = true;

            if (!fs.existsSync(item.exe) || !fs.statSync((item.exe)).isFile()) {
                console.log(`ERROR - ${tool} executable path doesn't exists ${item.exe}`)
                process.exit()
            }
        } else if (hasbin.sync(tool)) {
            item.found = true;  // use default exe
        } else if (item.exe) {
            // Tool that have no default, don't need to give warning
            console.log(`WARNING - could not find ${tool} in your path`)
        }
    }
}

app.get('/getTools', async (req, res) => {
    var availableTools = [];
    for (const tool in allTools) {
        if (allTools[tool].public && allTools[tool].found) {
            availableTools.push(tool)
        }
    }
    res.send(availableTools);
});

// Create a single temp file used every time
const sourceFile = tmp.fileSync();
const displayFileName = '[INPUT FILE]';

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

function buildCommand(toolInfo, flags) {
    if (toolInfo.name == 'spirv-opt') {
        // spirv-opt needs the '=' between
        flags = flags.replace(/--target-env\s+(\S+)/g, '--target-env=$1');
    }

    var command = `${toolInfo.exe} ${flags} ${sourceFile.name}`;
    if (toolInfo.output == 'spirv') {
        command += ` -o ${sourceFile.name}`
    }

    // Special case for tools that need it
    if (toolInfo.name == 'gpuav') {
        command = `${toolInfo.exe} ${sourceFile.name} -o ${sourceFile.name} ${flags}`;
    }

    return command;
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

    var toolInfo = allTools[req.body.tool];

    // If input is disassembled SPIR-V, turn to binary first
    if (toolInfo.input == 'spirv') {
        const spirvTargetEnv = getSpirvTargetEnv(req.body.flags);
        try {
            // Just override temp file, no need to keep original disassembly
            const asCommand = `${allTools['spirv-as'].exe} ${sourceFile.name} -o ${sourceFile.name} ${spirvTargetEnv}`;
            console.log(asCommand + '\n');
            await exec(asCommand);
        } catch (error) {
            result.success = false
            result.error.cmd = error.cmd.replaceAll(sourceFile.name, displayFileName);
            result.error.stdout = error.stdout.replaceAll(sourceFile.name, displayFileName);
            result.error.stderr = error.stderr.replaceAll(sourceFile.name, displayFileName);
            return res.send(result);
        }
    }

    var command = buildCommand(toolInfo, req.body.flags);

    try {
        // print command to allow people to copy and use it elsewhere
        console.log(command + '\n');
        result.output = (await exec(command)).stdout;
    } catch (error) {
        result.success = false;
        result.error.cmd = error.cmd.replaceAll(sourceFile.name, displayFileName);
        result.error.stdout = error.stdout.replaceAll(sourceFile.name, displayFileName);
        result.error.stderr = error.stderr.replaceAll(sourceFile.name, displayFileName);
        return res.send(result);
    }

    var lastTool = toolInfo;
    if (req.body.tool2) {
        var tool2Info = allTools[req.body.tool2];
        if (tool2Info.input == 'text') {
            result.success = false;
            result.error.stderr = `Pipeline 2 can not use ${req.body.tool2} because the input is not SPIR-V`;
            return res.send(result);
        }
        if (toolInfo.output == 'status') {
            result.success = false;
            result.error.stderr = `Pipeline 2 can not use ${req.body.tool2} because the the previous pipeline is ${req.body.tool1}`;
            return res.send(result);
        } else if (toolInfo.output == 'text') {
            fs.writeFileSync(sourceFile.name, result.output);
            const spirvTargetEnv = getSpirvTargetEnv(req.body.flags2)
            const asCommand = `${allTools['spirv-as'].exe} ${sourceFile.name} -o ${sourceFile.name} ${spirvTargetEnv}`;
            console.log(asCommand + '\n');
            await exec(asCommand);  // TODO - error catch
        }

        try {
            command = buildCommand(tool2Info, req.body.flags2);
            console.log(command + '\n');
            result.output = (await exec(command)).stdout;
        } catch (error) {
            result.success = false;
            result.error.cmd = error.cmd.replaceAll(sourceFile.name, displayFileName);
            result.error.stdout = error.stdout.replaceAll(sourceFile.name, displayFileName);
            result.error.stderr = error.stderr.replaceAll(sourceFile.name, displayFileName);
            return res.send(result);
        }
        lastTool = tool2Info;

        if (req.body.tool3) {
            var tool3Info = allTools[req.body.tool3];
            if (tool3Info.input == 'text') {
                result.success = false;
                result.error.stderr = `Pipeline 3 can not use ${req.body.tool3} because the input is not SPIR-V`;
                return res.send(result);
            }

            if (tool2Info.output == 'status') {
                result.success = false;
                result.error.stderr =
                    `Pipeline 3 can not use ${req.body.tool3} because the the previous pipeline is ${req.body.tool2}`;
                return res.send(result);
            } else if (tool2Info.output == 'text') {
                fs.writeFileSync(sourceFile.name, result.output);
                const spirvTargetEnv = getSpirvTargetEnv(req.body.flags3)
                const asCommand = `${allTools['spirv-as'].exe} ${sourceFile.name} -o ${sourceFile.name} ${spirvTargetEnv}`;
                console.log(asCommand + '\n');
                await exec(asCommand);  // TODO - error catch
            }

            try {
                command = buildCommand(tool3Info, req.body.flags3);
                console.log(command + '\n');
                result.output = (await exec(command)).stdout;
            } catch (error) {
                result.success = false;
                result.error.cmd = error.cmd.replaceAll(sourceFile.name, displayFileName);
                result.error.stdout = error.stdout.replaceAll(sourceFile.name, displayFileName);
                result.error.stderr = error.stderr.replaceAll(sourceFile.name, displayFileName);
                return res.send(result);
            }
            lastTool = tool3Info;
        }
    }

    if (result.success && lastTool.output == 'spirv') {
        // need to get out to spirv
        const disCommand = `${allTools['spirv-dis'].exe} ${sourceFile.name}`;
        console.log(disCommand + '\n');
        result.output = (await exec(disCommand)).stdout;
    }

    res.send(result);
});

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

    const disCommand = `${allTools['spirv-dis'].exe} ${sourceFile.name}`;
    console.log(disCommand + '\n');

    try {
        result.data = (await exec(disCommand)).stdout;
    } catch (error) {
        result.success = false
        result.data = error.stderr;
    }

    res.send(result);
});

app.listen(port, () => {
    SetUpTools();
    console.log(`\nSPIRV-Playground is live at http://localhost:${port}`);
    console.log(`-------------------------------------------------\n`);
});

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
function shutDown() {
    sourceFile.removeCallback();
    process.exit(0);
}
