"use_strict";

const workerpool = require('workerpool');

const B64_URL_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

// https://github.com/digitalbazaar/forge/blob/master/lib/prime.worker.js#L14
const SMALL_PRIMES = [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n,
  59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n, 101n, 103n, 107n, 109n, 113n, 127n, 131n,
  137n, 139n, 149n, 151n, 157n, 163n, 167n, 173n, 179n, 181n, 191n, 193n, 197n, 199n, 211n,
  223n, 227n, 229n, 233n, 239n, 241n, 251n, 257n, 263n, 269n, 271n, 277n, 281n, 283n, 293n,
  307n, 311n, 313n, 317n, 331n, 337n, 347n, 349n, 353n, 359n, 367n, 373n, 379n, 383n, 389n,
  397n, 401n, 409n, 419n, 421n, 431n, 433n, 439n, 443n, 449n, 457n, 461n, 463n, 467n, 479n,
  487n, 491n, 499n, 503n, 509n, 521n, 523n, 541n, 547n, 557n, 563n, 569n, 571n, 577n, 587n,
  593n, 599n, 601n, 607n, 613n, 617n, 619n, 631n, 641n, 643n, 647n, 653n, 659n, 661n, 673n,
  677n, 683n, 691n, 701n, 709n, 719n, 727n, 733n, 739n, 743n, 751n, 757n, 761n, 769n, 773n,
  787n, 797n, 809n, 811n, 821n, 823n, 827n, 829n, 839n, 853n, 857n, 859n, 863n, 877n, 881n,
  883n, 887n, 907n, 911n, 919n, 929n, 937n, 941n, 947n, 953n, 967n, 971n, 977n, 983n, 991n,
  997n];

/**
 * Deterministically generates RSA keys from seeds
 * @param {number} bits Number of bits the modulus will contain
 * @param {Uint8Array} seed 32 byte Uint8Array for seeding prime generation
 * @param {BigInt} e Public encryption exponent to be stored in public key
 * @returns {privateKey: {JsonWebKey}, publicKey: {JsonWebKey}} A public and private JWK
 */
async function rsaGenKeys(bits, seed, e = 65537n) {
  if (bits % 32) throw Error("bits must be a multiple of 32");
  if (bits < 192) throw Error("bits must be at least 192");
  if (seed.length < 32) throw Error("seed must contain at least 32 bytes");

  // Initialize prime generation
  const pBits = bits >> 1;
  const qBits = bits - pBits;
  const pSeed = new Uint8Array(seed.slice(0, 16));
  const qSeed = new Uint8Array(seed.slice(16, 32));

  // Generate primes multithreaded
  const pool = workerpool.pool()
  let [p, q] = await Promise.all([
    pool.exec(seededRandPrime, [pBits, pSeed, e, SMALL_PRIMES]),
    pool.exec(seededRandPrime, [qBits, qSeed, e, SMALL_PRIMES])
  ]);
  pool.terminate();


  const n = p * q; // Public modulus
  if (n.toString(2).length != bits) throw Error("Generation resulted in an incorrect modulus");

  const p1 = p - 1n;
  const q1 = q - 1n;
  const phi = p1 * q1; // aka mod coprimes, or euler's totient
  if (gcd(phi, e) !== 1n)  throw Error("Phy and e were not coprime"); // Check for phi-e coprimality

  if (q === p) throw Error("q and p were the same, heat death of universe before this happens");

  // Ensure p > q, otherwise swap (fast xor swap)
  if (q > p) {
    p ^= q;
    q ^= p;
    p ^= q;
  }

  // https://github.com/rzcoder/node-rsa/blob/master/src/libs/rsa.js#L93
  // https://self-issued.info/docs/draft-jones-jose-json-private-and-symmetric-key-00.html
  const d = modInverse(e, phi);
  const dp = d % p1;
  const dq = d % q1;
  const qi = modInverse(q, p);

  const b64n = biToB64url(n);
  const b64e = biToB64url(e);

  // Convert to JWK 
  // https://coolaj86.com/articles/bigints-and-base64-in-javascript/
  // https://tools.ietf.org/id/draft-jones-json-web-key-01.html#rfc.section.5
  // https://datatracker.ietf.org/doc/html/rfc7517#appendix-A.2
  // https://github.com/ipfs-shipyard/js-human-crypto-keys/blob/master/src/keys/rsa.js#L14-L36
  // https://github.com/digitalbazaar/forge/blob/master/lib/rsa.js#L1149
  // https://self-issued.info/docs/draft-jones-jose-json-private-and-symmetric-key-00.html
  return {
    privateKey: {
      "kty": "RSA",
      "n": b64n,
      "e": b64e,
      "d": biToB64url(d),
      "p": biToB64url(p),
      "q": biToB64url(q),
      "dp": biToB64url(dp),
      "dq": biToB64url(dq),
      "qi": biToB64url(qi)
    },
    publicKey: {
      "kty": "RSA",
      "n": b64n,
      "e": b64e
    }
  };
}

/**
 * Generates a random prime given a 32bit number seed
 * @param {number} bits How many bits the prime will contain, ceiled to multiple of 32
 * @param {Uint8Array} seed 16 byte Uint8Array for seeding prime generation
 * @param {BigInt} exp RSA Exponent, use to check coprimality
 * @param {Array<number>} SMALL_PRIMES Array of pre-generated primes to validate against
 * @returns {BigInt} Prime number of size bits
 */
function seededRandPrime(bits, seed, exp, small_primes) {
  if (bits < 96) throw Error("Bits must be at least 96");
  if (seed.length < 16) throw Error("Seed byte buffer must be at least 16 bytes");

  const dataView = new DataView(seed.buffer);
  let rand_a = dataView.getUint32(0);
  let rand_b = dataView.getUint32(4);
  let rand_c = dataView.getUint32(8);
  let rand_d = dataView.getUint32(12);
  let rand_t, rand_r;

  /**
   * Generates a 32 bit random number
   * https://stackoverflow.com/a/47593316/12802155
   * @returns {number} A number of at least 32 random bits
   */
  function xoshiro128ss() {
    rand_t = rand_b << 9, rand_r = rand_a * 5; rand_r = (rand_r << 7 | rand_r >>> 25) * 9;
    rand_c ^= rand_a; rand_d ^= rand_b;
    rand_b ^= rand_c; rand_a ^= rand_d; rand_c ^= rand_t;
    rand_d = rand_d << 11 | rand_d >>> 21;
    return rand_r >>> 0;
  }

  /**
   * Checks if a BigInt is probably prime
   * https://rosettacode.org/wiki/Miller%E2%80%93Rabin_primality_test#JavaScript
   * @param {BigInt} n The BigInt to test for primality
   * @param {number} k How many rounds to test the number, each round increases confidence by 75%
   * @returns {boolean} True means it"s probably prime, false meaning composite
   */
  function millerRabin(n, k) {
    // Write (n - 1) as 2^s * d
    let s = 0, d = n - 1n;
    while (d % 2n === 0n) {
      d /= 2n;
      ++s;
    }

    WitnessLoop: do {
      // A base between 2 and n - 2
      let x = modExp(BigInt(xoshiro128ss()) + 2n, d, n);
      if (x === 1n || x === n - 1n) continue;

      // b1 to bk
      for (let i = s - 1; i--;) {
        x = modExp(x, 2n, n);
        if (x === 1n)
          return false;
        if (x === n - 1n)
          continue WitnessLoop;
      }

      return false;
    } while (--k);

    return true;
  }

  /**
   * Returns the required number of Miller-Rabin tests to generate a prime with an error probability of (1/2)^80.
   * https://github.com/digitalbazaar/forge/blob/c666282c812d6dc18e97b419b152dd6ad98c802c/lib/prime.worker.js#L155
   * @param {number} bits Bit size
   * @returns {number} The required number of iterations.
   */
  function getMillerRabinTests(bits) {
    if (bits <= 100) return 27;
    if (bits <= 150) return 18;
    if (bits <= 200) return 15;
    if (bits <= 250) return 12;
    if (bits <= 300) return 9;
    if (bits <= 350) return 8;
    if (bits <= 400) return 7;
    if (bits <= 500) return 6;
    if (bits <= 600) return 5;
    if (bits <= 800) return 4;
    if (bits <= 1250) return 3;
    return 2;
  }

  /**
   * Performs modular exponentiation (a ^ b % n)
   * https://gist.github.com/krzkaczor/0bdba0ee9555659ae5fe
   * @param {BigInt} a Base
   * @param {BigInt} b Exponent
   * @param {BigInt} n Modulus
   * @returns {BigInt} Result of the operation
   */
  function modExp(a, b, n) {
    a = a % n;
    let result = 1n;
    let x = a;
    while (b > 0) {
      let leastSignificantBit = b & 1n;
      b = b / 2n;
      if (leastSignificantBit === 1n) {
        result = result * x;
        result = result % n;
      }
      x = x * x;
      x = x % n;
    }
    return result;
  };

  /**
   * Get the greatest common divisor
   * Can be improved https://en.wikipedia.org/wiki/Lehmer%27s_GCD_algorithm
   * @param {BigInt} a 
   * @param {BigInt} b Must be smaller than a
   * @returns {BigInt} Greatest common divisor
   */
  function gcd(a, b) {
    while (true) {
      if (b === 0n) return a;
      a %= b;
      if (a === 0n) return b;
      b %= a;
    }
  }
  

  const bytes = Math.ceil(bits / 32) * 4;
  bits = bytes * 8;

  // Generate a random BigInt, assumes at least 96 bits and bits are multiple of 32
  let primeCand = BigInt((xoshiro128ss() | 0xC0000000) >>> 0) << BigInt(bits - 32); // Set 2 MSBs to 1 to guarantee product bit length
  for (let bitShift = BigInt(bits - 64); bitShift > 0n; bitShift -= 32n)
    primeCand |= BigInt(xoshiro128ss()) << bitShift;
  primeCand |= BigInt((xoshiro128ss() | 1) >>> 0); // Set LSB to 1 to guarantee odd

  let composite, randShift;
  for (; ;) {
    // Check primality
    composite = false;
    for (let i = 0; i < small_primes.length; ++i)
      if (primeCand % small_primes[i] === 0n) {
        composite = true;
        break;
      }
    if (
      !composite &&
      millerRabin(primeCand, getMillerRabinTests(bits)) &&
      gcd(primeCand - 1n, exp) === 1n // Check prime - 1 is coprime with exponent
    ) return primeCand;

    // BigInt wasn't valid, flip a random bit (excluding 2 MSB and LSB)
    randShift = xoshiro128ss() % (bits - 3) + 1;
    primeCand ^= 1n << BigInt(randShift);
  }
}

/**
 * Get the greatest common divisor
 * Can be improved https://en.wikipedia.org/wiki/Lehmer%27s_GCD_algorithm
 * @param {BigInt} a 
 * @param {BigInt} b Must be smaller than a
 * @returns {BigInt} Greatest common divisor
 */
function gcd(a, b) {
  while (true) {
    if (b === 0n) return a;
    a %= b;
    if (a === 0n) return b;
    b %= a;
  }
}

/**
 * Mod Inverse, aka EEA / EGCD optimized for only finding coefficient of A
 * https://stackoverflow.com/a/27736785/5623318
 * Maybe can be improved
 *  - https://math.stackexchange.com/a/3839960/925321
 *  - https://en.wikipedia.org/wiki/Hensel%27s_lemma
 * @param {BigInt} exp e, Public encryption exponent to be stored in public key
 * @param {BigInt} phi 
 * @returns {BigInt} d, Decryption exponent to be stored in private key
 */
function modInverse(exp, phi) {
  let q;
  let v = phi;
  let u1 = 1n;
  let u3 = exp;
  let v1 = 0n;
  let v3 = phi;
  let iter = 1n;
  while (v3 !== 0n) {
    q = u3 / v3;
    t3 = u3 % v3;
    t1 = u1 + q * v1;
    u1 = v1; // Maybe try wrapping js values in object to swap references instead of large copies in heap
    v1 = t1;
    u3 = v3;
    v3 = t3;
    iter = -iter;
  }
  if (u3 != 1n) return 0n;
  return iter > 0n ? u1 : v - u1;
}

/**
 * Encode native JS BigInt to base64url for JWK
 * https://coolaj86.com/articles/bigints-and-base64-in-javascript/
 * @param {BigInt} num BigInt to encode
 * @returns {string} base64url encoded BigInt 
 */
function biToB64url(num) {
  let hex = num.toString(16);
  if (hex.length & 1) hex = '0' + hex
  
  const bin = [];
  let i = 0;
  let d, b;
  while (i < hex.length) {
    d = parseInt(hex.slice(i, i + 2), 16);
    b = String.fromCharCode(d);
    bin.push(b);
    i += 2;
  }
  return btoa(bin.join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');;
}

// https://coolaj86.com/articles/bigints-and-base64-in-javascript/
if (typeof btoa === "undefined")
  var btoa = (bin) => Buffer.from(bin, 'binary').toString('base64');

module.exports = { rsaGenKeys };