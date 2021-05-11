//#![no_std] // Ideally we use no_std but not possible for now
#![allow(clippy::missing_safety_doc)]

use rand_chacha::{ ChaCha8Rng, rand_core::SeedableRng };
use rsa::{ PublicKeyParts, RSAPrivateKey};
use num_bigint_dig::{ToBigInt, ModInverse};
use simple_asn1::ASN1Block;
use pem::{ LineEnding, EncodeConfig, Pem, encode_config };

#[no_mangle]
pub unsafe extern "C" fn gen_keys(bits: u32, seed_ptr: *const u8) -> *const u32 {
    let seed = unsafe { *(seed_ptr as *const [u8; 32]) };
    let mut prng = ChaCha8Rng::from_seed(seed);
    let private_key = RSAPrivateKey::new(&mut prng, bits as usize)
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

#[no_mangle]
pub extern "C" fn alloc_seed_array() -> *const u8 {
    let seed_arr = Box::new(Vec::<u8>::with_capacity(64));
    let seed_arr_ptr = seed_arr.as_ptr();
    Box::leak(seed_arr);
    seed_arr_ptr
}

// TODO:
//   Create function to free data on heap given the str_info ptr

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gen_keys() {
        let seed_arr_ptr = alloc_seed_array();
        unsafe { gen_keys(4096, seed_arr_ptr) } ;
    }
}

// https://docs.rs/rsa-export
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
