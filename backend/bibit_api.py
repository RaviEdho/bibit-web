"""
Bibit API Client
Handles encrypted request/response exchange with api.bibit.id.
"""

import os
import time
import json
import urllib.request
import urllib.parse
import urllib.error

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

BASE_URL = "https://api.bibit.id"
HEADERS = {
    "Accept": "application/json",
    "Origin": "https://bibit.id",
    "Referer": "https://bibit.id/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def decrypt_bibit(encrypted_data: str) -> dict | list:
    """
    Decrypts AES-256-CBC encrypted payload from Bibit API.
    """
    if not isinstance(encrypted_data, str) or len(encrypted_data) <= 64:
        raise ValueError("Encrypted payload is too short or invalid")

    iv = bytes.fromhex(encrypted_data[:32])
    key = encrypted_data[-32:].encode("utf-8")
    ciphertext = bytes.fromhex(encrypted_data[32:-32])

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded) + unpadder.finalize()
    return json.loads(plaintext.decode("utf-8"))


def fetch_api(
    endpoint: str,
    params: dict | None = None,
    token: str | None = None,
    max_retries: int = 3,
    timeout: int = 15
) -> dict | list:
    """
    Executes a GET request to api.bibit.id and returns decrypted JSON.
    """
    url = f"{BASE_URL}{endpoint}"
    if params:
        url += f"?{urllib.parse.urlencode(params)}"

    headers = dict(HEADERS)
    auth_token = token or os.environ.get("BIBIT_ACCESS_TOKEN")
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
                parsed = json.loads(body)
                if "data" in parsed and isinstance(parsed["data"], str):
                    return decrypt_bibit(parsed["data"])
                return parsed
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt == max_retries:
                raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts: {e}")
            time.sleep(attempt * 0.8)
        except Exception:
            if attempt == max_retries:
                raise
            time.sleep(attempt * 0.8)
