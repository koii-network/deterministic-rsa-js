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

Testing

`cargo test --release` or `cargo test --release -- --nocapture`

## TODO
- free data on heap
- clean up implementation
- properly document
- 3rd party audit
- make strinfo on heap contiguous (u32 for len N, the next N bytes is the data)
- contribute to RSA crate for multi threaded prng
- contribute to RSA create for Wasm to use native javascript BigInt
