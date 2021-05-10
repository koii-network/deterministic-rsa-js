//#![no_std] // Ideally we use no_std but not possible for now

use {
    rand_chacha::{ ChaCha20Rng, rand_core::SeedableRng },
    rsa::{ RSAPrivateKey, PrivateKeyPemEncoding }
};

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
    let pem_pkcs1 = private_key.to_pem_pkcs1().unwrap()
        .into_boxed_str();

    let str_info = Box::new([pem_pkcs1.as_ptr() as u32, pem_pkcs1.len() as u32]);
    let info_ptr = str_info.as_ptr();

    // Drop references as to not call the destructor
    Box::leak(pem_pkcs1);
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