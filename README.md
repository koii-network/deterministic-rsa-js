# deterministic-rsa
Deterministic RSA using fast and portable Rust 

Can be used to generate RSA keys based on mnemonic keys

Supports targets:

- Wasm Browser and Node.js (will be available on npm)
- Native shared library
- Rust crate (will be available on crates.io)

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

Build Native shared library
```
cargo build --release
strip target/release/*.so 
```

Testing

`cargo test --release`