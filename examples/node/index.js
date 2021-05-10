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
    const prime_ptr = wasm_inst.exports.gen_keys(4096, 0);
    
    console.log("Reading output");
    const mem = new Uint8Array(wasm_inst.exports.memory.buffer);
    const prime_str_bytes = mem.slice(prime_ptr, prime_ptr + 256);
    const prime_str = new TextDecoder('utf-8').decode(prime_str_bytes);

    console.log(prime_str);

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
