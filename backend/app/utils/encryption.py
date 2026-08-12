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
    def _key_from_env_file() -> str:
        """Read ENCRYPTION_KEY straight from backend/.env.

        The environment variable is only populated once the application's
        lifespan handler has run (main.py copies it out of settings). Anything
        that decrypts during import — notably database.py rebuilding the
        connection URL from DB_PASSWORD_ENCRYPTED — runs before that, and
        would otherwise find no key at all. database.py already reads .env
        directly for the same reason; this makes the two agree.
        """
        from pathlib import Path

        env_path = Path(__file__).resolve().parent.parent.parent / ".env"
        try:
            if not env_path.exists():
                return ""
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("ENCRYPTION_KEY="):
                    return line[len("ENCRYPTION_KEY="):].strip()
        except OSError:
            pass
        return ""

    @staticmethod
    def get_encryption_key() -> bytes:
        """
        Get the encryption key: environment first, then backend/.env.

        There is deliberately no default. There used to be one, described as
        "a valid Fernet key for development only" — it was not: it decodes to
        35 bytes where Fernet requires exactly 32, so every call using it
        raised anyway, two steps removed from the real problem. A working
        default would have been worse, quietly protecting credentials with a
        key published in the source.
        """
        # Import here to avoid circular dependency
        import os
        key_str = os.environ.get("ENCRYPTION_KEY", "") or EncryptionService._key_from_env_file()

        if key_str:
            return key_str.encode()

        raise RuntimeError(
            "ENCRYPTION_KEY is not set in the environment, so stored "
            "credentials (SMTP password, Twilio SID and token) can be neither "
            "written nor read. Generate one with:\n"
            "  python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\"\n"
            "and put it in backend/.env as ENCRYPTION_KEY. Note that changing "
            "an existing key makes everything already encrypted unreadable."
        )
    
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
