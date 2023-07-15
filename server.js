const express = require('express');
const fs = require('fs');
const tmp = require('tmp');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)
const app = express()
const port = 9000

app.use(express.static('.'))
app.use(express.json())

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/index.html`);
})

app.post('/validate', async (req, res) => {
    var result = {
        "success" : true,
        "commands" : {
            "as" : true,
            "val" : true,
            "opt" : true,
            "dis" : true
        },
        "error" : {
            "cmd" : "",
            "stderr" : "",
        },
        "spirv" : ""
    }

    const spvasmFile = tmp.fileSync();
    const spvFile = tmp.fileSync();
    fs.writeFileSync(spvasmFile.name, req.body.spirv);

    try {
        const asCommand = `spirv-as ${spvasmFile.name} -o ${spvFile.name} --target-env ${req.body.targetEnv}`;
        await exec(asCommand);
    } catch (error) {
        result.success = false
        result.commands.as = false
        result.error.cmd = error.cmd;
        result.error.stderr = error.stderr;
    }

    if (result.success) {
        try {
            const valCommand = `spirv-val --target-env ${req.body.targetEnv} ${spvFile.name}`;
            await exec(valCommand);
        } catch (error) {
            result.success = false
            result.commands.val = false
            result.error.cmd = error.cmd;
            result.error.stderr = error.stderr;
        }
    }

    if (result.success) {
        try {
            const optCommand = `spirv-opt ${spvFile.name} -o ${spvFile.name}`;
            await exec(optCommand);
        } catch (error) {
            result.success = false
            result.commands.opt = false
            result.error.cmd = error.cmd;
            result.error.stderr = error.stderr;
        }
    }

    if (result.success) {
        try {
            const disCommand = `spirv-dis ${spvFile.name} --no-header --no-color`;
            result.spirv = (await exec(disCommand)).stdout;
        } catch (error) {
            result.success = false
            result.commands.dis = false
            result.error.cmd = error.cmd;
            result.error.stderr = error.stderr;
        }
    }

    res.send(result);
    spvasmFile.removeCallback();
    spvFile.removeCallback();
})

app.listen(port, () => {
  console.log(`SPIRV-Playground is live at http://localhost:${port}`)
})

