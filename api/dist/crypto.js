"use strict";
/**
 * AES-256-GCM encryption/decryption using the Web Crypto API.
 * The app password is used with PBKDF2 to derive an encryption key.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const PBKDF2_ITERATIONS = 200_000;
const KEY_LENGTH = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;
function b64ToBytes(b64) {
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
}
function bytesToB64(bytes) {
    let binStr = '';
    for (const b of bytes) {
        binStr += String.fromCharCode(b);
    }
    return btoa(binStr);
}
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
    }, keyMaterial, { name: 'AES-GCM', length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
}
async function encrypt(plaintext, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKey(password, salt);
    const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    return {
        ciphertext: bytesToB64(new Uint8Array(ciphertextBuf)),
        salt: bytesToB64(salt),
        iv: bytesToB64(iv),
    };
}
async function decrypt(blob, password) {
    const dec = new TextDecoder();
    const salt = b64ToBytes(blob.salt);
    const iv = b64ToBytes(blob.iv);
    const key = await deriveKey(password, salt);
    const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, b64ToBytes(blob.ciphertext));
    return dec.decode(plaintextBuf);
}
