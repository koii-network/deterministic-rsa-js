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

## Planned goals