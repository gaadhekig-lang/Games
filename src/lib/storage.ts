import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "default-secret-key";

const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

const secureStorage = {
  async getItem(key: string) {
    const encrypted = await storage.getItem(key);
    if (!encrypted) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error("Decryption failed or empty");
      return decrypted;
    } catch (error) {
      console.warn("Failed to decrypt data, clearing storage:", error);
      await storage.removeItem(key);
      return null;
    }
  },
  async setItem(key: string, value: string) {
    const encrypted = CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
    return storage.setItem(key, encrypted);
  },
  async removeItem(key: string) {
    return storage.removeItem(key);
  },
};

export default secureStorage;
