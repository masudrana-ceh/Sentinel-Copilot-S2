/**
 * tools/ctf.js
 * CTF Tools
 */

export const ctfTools = {
    'base-converter': {
        id: 'base-converter',
        name: 'Base Converter',
        subject: 'ctf',
        icon: 'fa-sync',
        description: 'Convert between decimal, hex, binary, and ASCII',
        inputs: [
            { name: 'input', label: 'Input', placeholder: '48656C6C6F or 72', type: 'text' },
            { name: 'from', label: 'From', type: 'select', options: ['hex', 'decimal', 'binary', 'ascii'] },
            { name: 'to', label: 'To', type: 'select', options: ['hex', 'decimal', 'binary', 'ascii'] }
        ],
        execute: (input, from = 'hex', to = 'ascii') => {
            try {
                let decimal;
                
                switch (from) {
                    case 'decimal': decimal = parseInt(input); break;
                    case 'hex': decimal = parseInt(input, 16); break;
                    case 'binary': decimal = parseInt(input, 2); break;
                    case 'ascii': 
                        return {
                            input,
                            from,
                            to,
                            result: to === 'hex' ? 
                                input.split('').map(c => c.charCodeAt(0).toString(16)).join('') :
                                to === 'decimal' ?
                                input.split('').map(c => c.charCodeAt(0)).join(' ') :
                                input.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')
                        };
                }

                let result;
                switch (to) {
                    case 'decimal': result = decimal.toString(); break;
                    case 'hex': result = decimal.toString(16); break;
                    case 'binary': result = decimal.toString(2); break;
                    case 'ascii': result = String.fromCharCode(decimal); break;
                }

                return { input, from, to, result };
            } catch (e) {
                return { error: e.message };
            }
        }
    },

    'hash-identifier': {
        id: 'hash-identifier',
        name: 'Hash Identifier',
        subject: 'ctf',
        icon: 'fa-fingerprint',
        description: 'Identify hash types by pattern and length',
        inputs: [
            { name: 'hash', label: 'Hash', placeholder: 'Paste hash here', type: 'text' }
        ],
        execute: (hash) => {
            const h = hash.trim();
            const patterns = [
                { regex: /^[a-f0-9]{32}$/i, name: 'MD5', length: 32 },
                { regex: /^[a-f0-9]{40}$/i, name: 'SHA-1', length: 40 },
                { regex: /^[a-f0-9]{64}$/i, name: 'SHA-256', length: 64 },
                { regex: /^[a-f0-9]{96}$/i, name: 'SHA-384', length: 96 },
                { regex: /^[a-f0-9]{128}$/i, name: 'SHA-512', length: 128 },
                { regex: /^\$2[aby]?\$\d+\$.{53}$/, name: 'bcrypt', length: 60 },
                { regex: /^\$6\$[a-zA-Z0-9./]+\$[a-zA-Z0-9./]{86}$/, name: 'SHA-512 crypt', length: 106 },
                { regex: /^\$1\$[a-zA-Z0-9./]+\$[a-zA-Z0-9./]{22}$/, name: 'MD5 crypt', length: 34 },
                { regex: /^[a-f0-9]{16}$/i, name: 'MySQL (old)', length: 16 },
                { regex: /^\*[A-F0-9]{40}$/i, name: 'MySQL 5+', length: 41 }
            ];

            const matches = patterns.filter(p => p.regex.test(h));
            
            return {
                hash: h.slice(0, 20) + '...',
                length: h.length,
                possibleTypes: matches.length > 0 ? matches.map(m => m.name) : ['Unknown'],
                crackTools: matches.length > 0 ? 
                    ['hashcat', 'john', 'hash-identifier'] : 
                    ['Check format']
            };
        }
    },

    'cipher-decoder': {
        id: 'cipher-decoder',
        name: 'Cipher Decoder',
        subject: 'ctf',
        icon: 'fa-lock',
        description: 'Decode Caesar, ROT13, Vigenère, Atbash, and Base64 ciphers',
        inputs: [
            { name: 'text', label: 'Encrypted Text', placeholder: 'URYYB JBEYQ', type: 'textarea' },
            { name: 'cipher', label: 'Cipher Type', placeholder: 'rot13', type: 'select', options: ['rot13', 'caesar', 'atbash', 'base64', 'vigenere'] },
            { name: 'key', label: 'Key (for Caesar/Vigenère)', placeholder: '3 or KEY', type: 'text' }
        ],
        execute: (text, cipher, key = '') => {
            const rot13 = (str) => str.replace(/[A-Za-z]/g, c => 
                String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))
            );

            const caesar = (str, shift) => {
                const s = parseInt(shift) || 0;
                return str.replace(/[A-Za-z]/g, c => {
                    const base = c <= 'Z' ? 65 : 97;
                    return String.fromCharCode(((c.charCodeAt(0) - base - s + 26) % 26) + base);
                });
            };

            const atbash = (str) => str.replace(/[A-Za-z]/g, c => {
                const base = c <= 'Z' ? 65 : 97;
                return String.fromCharCode(base + (25 - (c.charCodeAt(0) - base)));
            });

            const vigenere = (str, k) => {
                k = k.toUpperCase();
                let result = '', keyIndex = 0;
                for (let i = 0; i < str.length; i++) {
                    if (!/[A-Za-z]/.test(str[i])) {
                        result += str[i];
                        continue;
                    }
                    const base = str[i] <= 'Z' ? 65 : 97;
                    const shift = k.charCodeAt(keyIndex % k.length) - 65;
                    result += String.fromCharCode(((str[i].charCodeAt(0) - base - shift + 26) % 26) + base);
                    keyIndex++;
                }
                return result;
            };

            let result;
            switch (cipher) {
                case 'rot13':
                    result = rot13(text);
                    break;
                case 'caesar':
                    if (!key) return { error: 'Caesar cipher requires a shift key (0-25)' };
                    result = caesar(text, key);
                    break;
                case 'atbash':
                    result = atbash(text);
                    break;
                case 'base64':
                    try {
                        result = atob(text);
                    } catch (e) {
                        return { error: 'Invalid Base64 string' };
                    }
                    break;
                case 'vigenere':
                    if (!key) return { error: 'Vigenère cipher requires a key word' };
                    result = vigenere(text, key);
                    break;
                default:
                    return { error: 'Unknown cipher type' };
            }

            return {
                cipher: cipher.toUpperCase(),
                key: key || 'N/A',
                encrypted: text,
                decrypted: result,
                bruteforce: cipher === 'caesar' && !key ? 
                    Array.from({length: 26}, (_, i) => `Shift ${i}: ${caesar(text, i)}`).join('\n') : 
                    null
            };
        }
    }
};
