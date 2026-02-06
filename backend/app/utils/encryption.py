"""
Encryption utility for sensitive data (SMTP passwords, API keys, etc.)
Uses Fernet symmetric encryption (AES-128 CBC with HMAC authentication)
"""

import os
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Service for encrypting and decrypting sensitive data
    
    Encryption key is stored in environment variable ENCRYPTION_KEY
    If not set, a default development key is used (NOT FOR PRODUCTION!)
    """
    
    @staticmethod
    def get_encryption_key() -> bytes:
        """
        Get encryption key from os.environ (loaded via settings)
        
        SECURITY WARNING: In production, ALWAYS set ENCRYPTION_KEY environment variable!
        Default key is only for development/testing.
        """
        # Import here to avoid circular dependency
        import os
        key_str = os.environ.get("ENCRYPTION_KEY", "")
        
        if key_str:
            return key_str.encode()
        
        # Default development key (NOT SECURE - for dev only)
        logger.warning(
            "⚠️  ENCRYPTION_KEY not set! Using default development key. "
            "Set ENCRYPTION_KEY environment variable in production!"
        )
        # This is a valid Fernet key for development only
        return b'UGxlYXNlU2V0WW91ck93bkVuY3J5cHRpb25LZXlJblByb2Q='  # "PleaseSetYourOwnEncryptionKeyInProd" base64
    
    @staticmethod
    def generate_key() -> str:
        """
        Generate a new Fernet encryption key
        
        Use this to generate a key for ENCRYPTION_KEY environment variable:
        >>> python -c "from app.utils.encryption import EncryptionService; print(EncryptionService.generate_key())"
        """
        return Fernet.generate_key().decode()
    
    @staticmethod
    def encrypt(plain_text: str) -> str:
        """
        Encrypt a plain text string
        
        Args:
            plain_text: The text to encrypt
            
        Returns:
            Encrypted text as base64 string
        """
        if not plain_text:
            return ""
        
        try:
            key = EncryptionService.get_encryption_key()
            cipher = Fernet(key)
            encrypted_bytes = cipher.encrypt(plain_text.encode())
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise
    
    @staticmethod
    def decrypt(encrypted_text: str) -> str:
        """
        Decrypt an encrypted string
        
        Args:
            encrypted_text: The encrypted text (base64 string)
            
        Returns:
            Decrypted plain text
        """
        if not encrypted_text:
            return ""
        
        try:
            key = EncryptionService.get_encryption_key()
            cipher = Fernet(key)
            decrypted_bytes = cipher.decrypt(encrypted_text.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            # If decryption fails, might be plain text (migration scenario)
            logger.warning("Returning original text (might be unencrypted)")
            return encrypted_text
    
    @staticmethod
    def is_encrypted(text: str) -> bool:
        """
        Check if a string appears to be encrypted
        
        Args:
            text: The text to check
            
        Returns:
            True if text appears to be Fernet-encrypted
        """
        if not text:
            return False
        
        try:
            key = EncryptionService.get_encryption_key()
            cipher = Fernet(key)
            cipher.decrypt(text.encode())
            return True
        except Exception:
            return False
