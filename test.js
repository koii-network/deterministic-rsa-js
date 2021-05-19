"use_strict";

const bip39 = require("bip39");
const detRsa = require("./index");

main().then(console.log);

async function main() {
    
    const mnemonic = "violin artwork lonely inject resource jewel purity village abstract neglect panda license"
    const seed = await bip39.mnemonicToSeed(mnemonic);
    return await detRsa.rsaGenKeys(4096, seed);
    
    /* // Takes ~5 seconds on average, can probably be improved to 3
    const iters = 100;
    const start = (new Date()).getTime();
    for (let i = 0; i < iters; ++i) {
        const mnemonic = bip39.generateMnemonic();
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const res = await detRsa.rsaGenKeys(4096, seed);
        console.log(res);
    }
    console.log("Took", ((new Date()).getTime() - start) / (iters * 1000), "seconds on average");
    */
}
