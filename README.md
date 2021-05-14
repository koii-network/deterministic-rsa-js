**WARNING! This project has not yet been verified to be cryptographically secure. USE AT YOUR OWN RISK!** 

# deterministic-rsa-js
Deterministic RSA using vanilla JavaScript

Can be used to generate RSA keys based on mnemonic keys

## How it works

### Native BigInt, no byte array shims

The original version of this project used Rust which took ~1.3s to generate a key natively, however when compiled to WASM, it took ~15 seconds. This is a because the WASM implementation used Uint8Array as a shim for large integers which is very slow in JavaScript. In the current implementation, we use JS native BigInts which handles arbitrarily-precise integers at a machine code level. This is where most of the speed up comes from.

### Fast random number generation

Use simple 32bit math and bitwise operators. Instead of generating entirely new numbers, simply pick a random bit between `1` and `nBits - 3` then `^= 1n << bitShift` it (bitshift xor assign). In addition, we also save unused random bits for later use. This reduces how many times we need to run the number generation.

### Native Node crypto

When running, we check if the node crypto module is available. If it is, we use [`crypto.checkPrime()`](https://nodejs.org/api/crypto.html#crypto_crypto_checkprime_candidate_options_callback) to leverage the native C++ prime checking. Otherwise, we fallback to our JavaScript solution.

### Optimized memory behavior

Preallocate buffers and variables to reduce garbage collection. We also take care to only compare and assign values of the same type in order remove performance cost of type coercion and dynamic memory allocation.


## Testing
To test the node, run `node test/test.js`

To test in browser, open `test/index.html` with any browser

## TODO
- Publish to NPM
- Try to use Node crypto for the rest of RSA generation
- Add optimized prime checking implementation
    - In a typical [prime generation algorithm](https://en.wikipedia.org/wiki/Generation_of_primes#Large_primes), prime checking dominates the runtime at more than 90%. This is because large numbers are inherently difficult to check for [primality](https://en.wikipedia.org/wiki/Primality_test) as you would need to rule out all the factors up to the root of the number. Conventional RSA algorithms use [AKS](https://en.wikipedia.org/wiki/AKS_primality_test) for smaller numbers and multiple rounds of [Miller–Rabin](https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test) for larger numbers. Though Miller-Rabin is adequate, we improve on the process by using [QFT](https://en.wikipedia.org/wiki/Quadratic_Frobenius_test) or [Baillie-PSW](https://en.wikipedia.org/wiki/Baillie%E2%80%93PSW_primality_test) which is 3 times slower, but only ever requires 1 or 2 rounds with 2048 bits instead of Miller-Rabin's 10-15 rounds.

## Resources
- https://nodejs.org/api/crypto.html#crypto_crypto_checkprime_candidate_options_callback
- https://github.com/openssl/openssl/blob/master/apps/rsa.c
- https://github.com/jnyryan/rsa-encryption
- https://github.com/Anirban166/RSA-Cryptosystem
- https://github.com/bugaosuni59/RSA-homework
- https://github.com/CPerezz/rust-rsa
- https://github.com/suciluz/multithreaded-rsa-encryption
- https://github.com/digitalbazaar/forge/blob/master/lib/rsa.js#L595-L643
- https://github.com/digitalbazaar/forge/blob/master/lib/rsa.js#L710-L734
- https://github.com/digitalbazaar/forge/blob/master/lib/prime.worker.js#L58-L130
- https://gist.github.com/krzkaczor/0bdba0ee9555659ae5fe
- https://webassembly.github.io/JS-BigInt-integration/js-api/index.html
- https://webassembly.github.io/spec/js-api/
- https://stackoverflow.com/a/27736785/5623318
- https://stackoverflow.com/questions/521295
- https://stackoverflow.com/questions/5989429
- https://en.wikipedia.org/wiki/Hensel%27s_lemma
- https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test
- https://en.wikipedia.org/wiki/Fermat_primality_test
- https://en.wikipedia.org/wiki/Chinese_remainder_theorem
- https://en.wikipedia.org/wiki/Modular_exponentiation
- https://en.wikipedia.org/wiki/Frobenius_pseudoprime
- http://en.wikipedia.org/wiki/Montgomery_reduction#Modular_exponentiation
- https://link.springer.com/content/pdf/10.1007/3-540-48071-4_26.pdf
- https://link.springer.com/article/10.1007/s00145-006-0332-x
- https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-4.pdf#page=62
- https://www.di.ens.fr/~fouque/pub/prime.pdf
- https://arxiv.org/pdf/1503.04955.pdf
- https://lemire.me/blog/2016/06/27/a-fast-alternative-to-the-modulo-reduction/
- https://v8.dev/features/wasm-bigint
- https://math.stackexchange.com/a/3839960/925321
- https://docs.rs/num-bigint-dig/0.7.0/num_bigint_dig/trait.RandPrime.html
- http://www-cs-students.stanford.edu/~tjw/jsbn/
