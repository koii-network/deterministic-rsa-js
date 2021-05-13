**WARNING! This project has not yet been verified to be cryptographically secure. USE WITH CAUTION!** 

# deterministic-rsa
Deterministic RSA using fast and portable Rust 

Can be used to generate RSA keys based on mnemonic keys

Supports targets:

- Wasm Browser and Node.js (will be available on npm)

## Build

Dev env setup
```
rustup target add wasm32-unknown-unknown
cargo install wasm-gc
```

Build Wasm
```
cargo build --target wasm32-unknown-unknown --release
wasm-gc target/wasm32-unknown-unknown/release/*.wasm
```

Build native shared library
```
cargo build --release
strip target/release/*.so 
```

### Testing

#### Cargo
`cargo test --release` or `cargo test --release -- --nocapture`

#### Node
```
cp ./target/wasm32-unknown-unknown/release/deterministic_rsa.wasm examples/node
cd examples/node && node .
```

## TODO
- massive speedup potential if JS-native [BigInt bindings](https://tc39.es/ecma262/) are used
- free data on heap
- clean up implementation
- properly document
- 3rd party audit
- make strinfo on heap contiguous (u32 for len N, the next N bytes is the data)
- contribute to RSA crate for multi threaded prng
- contribute to RSA create for Wasm to use native javascript BigInt

## Resources
https://github.com/openssl/openssl/blob/master/apps/rsa.c
https://github.com/jnyryan/rsa-encryption
https://github.com/Anirban166/RSA-Cryptosystem
https://github.com/bugaosuni59/RSA-homework
https://github.com/CPerezz/rust-rsa
https://github.com/suciluz/multithreaded-rsa-encryption
https://github.com/digitalbazaar/forge/blob/c666282c812d6dc18e97b419b152dd6ad98c802c/lib/rsa.js#L595-L643
https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-4.pdf#page=62
https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test
https://en.wikipedia.org/wiki/Fermat_primality_test
https://en.wikipedia.org/wiki/Chinese_remainder_theorem
https://link.springer.com/content/pdf/10.1007/3-540-48071-4_26.pdf
https://www.di.ens.fr/~fouque/pub/prime.pdf
https://github.com/digitalbazaar/forge/blob/c666282c812d6dc18e97b419b152dd6ad98c802c/lib/rsa.js#L710-L734
https://github.com/digitalbazaar/forge/blob/c666282c812d6dc18e97b419b152dd6ad98c802c/lib/prime.worker.js#L58-L130
https://lemire.me/blog/2016/06/27/a-fast-alternative-to-the-modulo-reduction/
https://webassembly.github.io/JS-BigInt-integration/js-api/index.html
https://webassembly.github.io/spec/js-api/
https://v8.dev/features/wasm-bigint
https://arxiv.org/pdf/1503.04955.pdf
https://stackoverflow.com/a/27736785/5623318
https://math.stackexchange.com/a/3839960/925321
https://en.wikipedia.org/wiki/Hensel%27s_lemma
