"use strict";

/*
NOTE! Uint8Array.slice creates a new copy of the range
    rather than a reference of the original
    Do not use slice when trying to modify the heap!

~ 15.5s on average
benchmark 10 runs:
time (for i in {1..10}; do node . ; done)
*/

import { generateMnemonic, mnemonicToSeed } from "bip39";
import { readFile } from "fs";

main().then(res => {console.log(res)})

async function main() {
    console.log("Generating mnemonic seed");
    const mnemonic = generateMnemonic();
    //const mnemonic = "kite talk where disease april away exhibit recall hunt settle gain fail"; 
    console.log(mnemonic);
    const seed = await mnemonicToSeed(mnemonic);

    console.log("Loading Wasm");
    const exports = (await loadWasm("deterministic_rsa.wasm")).instance.exports;

    console.log("Preparing key gen");
    const seed_arr_ptr = exports.alloc_seed_array();
    const mem = new Uint8Array(exports.memory.buffer);
    const dataView = new DataView(exports.memory.buffer);
    mem.set(new Uint8Array(seed.buffer), seed_arr_ptr); // Load seed into heap

    console.log("Generating keys");
    const str_info_ptr = exports.gen_keys(4096, seed_arr_ptr);

    console.log("Locating output");
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
                memory: new WebAssembly.Memory({ initial: 2 }),
            }
            resolve(WebAssembly.instantiate(wasm_bin, { env: env }));
        });
    });
}