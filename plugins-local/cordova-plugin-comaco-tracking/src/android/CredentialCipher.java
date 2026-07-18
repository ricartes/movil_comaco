package io.gestionasi.comaco.tracking;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class CredentialCipher {
    private static final String STORE = "AndroidKeyStore";
    private static final String DEFAULT_ALIAS = "comaco_tracking_token_v1";
    private final String alias;

    CredentialCipher() {
        this(DEFAULT_ALIAS);
    }

    CredentialCipher(String alias) {
        this.alias = alias;
    }

    static final class Encrypted {
        final byte[] value;
        final byte[] iv;
        Encrypted(byte[] value, byte[] iv) { this.value = value; this.iv = iv; }
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance(STORE);
        store.load(null);
        if (store.containsAlias(alias)) {
            return ((KeyStore.SecretKeyEntry) store.getEntry(alias, null)).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE);
        generator.init(new KeyGenParameterSpec.Builder(alias,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }

    Encrypted encrypt(String clearText) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        return new Encrypted(cipher.doFinal(clearText.getBytes(StandardCharsets.UTF_8)), cipher.getIV());
    }

    String decrypt(byte[] encrypted, byte[] iv) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    }
}
