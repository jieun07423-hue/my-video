import crypto from 'crypto';
import { apiLogger } from '@/lib/logger';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secure-encryption-key-32bytes!!';

export class PhoneEncryptionUtil {
  /**
   * 결정적 암호화 (Deterministic Encryption): 동일한 전화번호에 대해 항상 동일한 암호화 결과 반환 (검색 가능)
   */
  static encrypt(phone: string): string {
    if (!phone) return '';
    try {
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      // 전화번호 기반 16바이트 고정 IV 생성으로 결정적 암호화 구현
      const iv = crypto.createHash('sha256').update(phone).digest().subarray(0, 16);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let encrypted = cipher.update(phone, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '전화번호 암호화 실패');
      return phone;
    }
  }

  /**
   * 복호화 (Decryption)
   */
  static decrypt(encryptedPhone: string): string {
    if (!encryptedPhone || !encryptedPhone.includes(':')) return encryptedPhone;
    try {
      const [ivHex, encrypted] = encryptedPhone.split(':');
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '전화번호 복호화 실패');
      return encryptedPhone;
    }
  }

  /**
   * 검색용 블라인드 해시 인덱스 (Blind Index) 생성
   */
  static hashForSearch(phone: string): string {
    if (!phone) return '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return crypto.createHmac('sha256', ENCRYPTION_KEY).update(cleanPhone).digest('hex');
  }
}

export default PhoneEncryptionUtil;
