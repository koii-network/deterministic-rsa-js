"use strict";

import { generateMnemonic, mnemonicToSeed } from "bip39";
import { readFile } from "fs";

main().then(res => {console.log(res)})

async function main() {
    console.log("Generating mnemonic seed");
    const mnemonic = "kite talk where disease april away exhibit recall hunt settle gain swamp"; // generateMnemonic();
    const seed = await mnemonicToSeed(mnemonic);

    console.log("Loading Wasm");
    const wasm_inst = (await loadWasm("deterministic_rsa.wasm")).instance;

    console.log("Generating keys");
    const str_info_ptr = wasm_inst.exports.gen_keys(4096, seed.buffer);
    
    console.log("Locating output");
    const mem = new Uint8Array(wasm_inst.exports.memory.buffer);

    const dataView = new DataView(mem.buffer);
    const str_ptr = dataView.getUint32(str_info_ptr, true);
    const str_len = dataView.getUint32(str_info_ptr + 4, true);

    console.log("Output found at", str_ptr, "with length", str_len);
    const key_str_bytes = mem.slice(str_ptr, str_ptr + str_len);
    const key_str = new TextDecoder('utf-8').decode(key_str_bytes);

    console.log(key_str);

    // TODO free string on Wasm heap after reading
}

async function loadWasm(path) {
    return new Promise(function (resolve, reject) {
        readFile(path, null, async (err, wasm_bin) => {
            if (err !== null) reject(err)
            const env = {
                memoryBase: 0,
                tableBase: 0,
                memory: new WebAssembly.Memory({ initial: 256 }),
                table: new WebAssembly.Table({
                    initial: 0,
                    element: "anyfunc"
                })
            }
            resolve(WebAssembly.instantiate(wasm_bin, { env: env }));
        });
    });
}
