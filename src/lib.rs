//#![no_std] // Ideally we use no_std but not possible for now

use rand_chacha::{ ChaCha20Rng, rand_core::SeedableRng };
use rsa::{PublicKeyParts, RSAPrivateKey};
use num_bigint_dig::{ToBigInt, ModInverse};
use simple_asn1::ASN1Block;
use pem::{ LineEnding, EncodeConfig, Pem, encode_config };

// https://docs.rs/jsonwebkey-convert
// https://docs.rs/jsonwebkey
// https://docs.rs/jsonwebtoken
// https://github.com/nhynes/jwk-rs
// https://docs.rs/rsa-export/0.3.3/src/rsa_export/lib.rs.html#127

// return A ptr to a [u32; 2]
//   first u32 is the ptr of output string
//   second u32 is the size of output string
#[no_mangle]
pub extern "C" fn gen_keys(bits: usize, seed: &[u8; 32]) -> *const u32 {
    let mut prng = ChaCha20Rng::from_seed(*seed);
    let private_key = RSAPrivateKey::new(&mut prng, bits)
        .unwrap();
    let pem_pkcs1_pem = private_key_pkcs1_pem(
            private_key_pkcs1(private_key)
    ).into_boxed_str();

    let str_info = Box::new([pem_pkcs1_pem.as_ptr() as u32, pem_pkcs1_pem.len() as u32]);
    let info_ptr = str_info.as_ptr();

    // Drop references as to not call the destructor
    Box::leak(pem_pkcs1_pem);
    Box::leak(str_info); 

    info_ptr
}

// TODO:
//   Create function to free data on heap given the str_info ptr

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gen_keys() {
        gen_keys(4096, &[0; 32]);
    }
}

/// Encode an RSA private key with PKCS#1
fn private_key_pkcs1(key: RSAPrivateKey) -> Vec<u8> {
    let mut data = Vec::new();

    data.push(ASN1Block::Integer(0, simple_asn1::BigInt::default()));
    data.push(ASN1Block::Integer(0, crate::to_bigint(key.n())));
    data.push(ASN1Block::Integer(0, crate::to_bigint(key.e())));
    data.push(ASN1Block::Integer(0, crate::to_bigint(key.d())));

    let primes = key.primes();
    let prime_1 = &primes[0];
    let prime_2 = &primes[1];

    data.push(ASN1Block::Integer(0, crate::to_bigint(prime_1)));
    data.push(ASN1Block::Integer(0, crate::to_bigint(prime_2)));
    data.push(ASN1Block::Integer(
        0,
        crate::to_bigint(&(key.d() % (prime_1 - 1_u8))),
    ));
    data.push(ASN1Block::Integer(
        0,
        crate::to_bigint(&(key.d() % (prime_2 - 1_u8))),
    ));

    let coefficient = prime_2.to_owned().mod_inverse(prime_1)
        .unwrap().to_signed_bytes_le();

    data.push(ASN1Block::Integer(
        0,
        simple_asn1::BigInt::from_signed_bytes_le(coefficient.as_slice()),
    ));

    simple_asn1::to_der(&ASN1Block::Sequence(0, data)).unwrap()
}

fn private_key_pkcs1_pem(private_key_pkcs1: Vec<u8>) -> String {
    let pem = Pem {
        tag: "RSA PRIVATE KEY".to_string(),
        contents: private_key_pkcs1
    };
    let config = EncodeConfig { line_ending: LineEnding::LF };
    encode_config(&pem, config)
}

fn to_bigint(biguint: &rsa::BigUint) -> simple_asn1::BigInt {
    simple_asn1::BigInt::from_signed_bytes_le(
        biguint.to_bigint().unwrap().to_signed_bytes_le().as_slice(),
    )
}
