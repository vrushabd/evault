import pytest
import jwt
from unittest.mock import MagicMock
from app.routes.documents import get_current_user, _normalize_user_claims
from app.config.settings import settings
from fastapi import HTTPException

SECRET = "changeme-use-a-long-random-secret-in-production-at-least-256-bits"

@pytest.mark.asyncio
async def test_get_current_user_hs384():
    """Verify JJWT 504-bit tokens signed with HS384 decode properly."""
    payload = {"walletAddress": "0x56b7ec62f1a23456789012345678901234567890", "role": "JUDGE"}
    token = jwt.encode(payload, SECRET, algorithm="HS384")

    request = MagicMock()
    request.headers.get.return_value = f"Bearer {token}"

    user = await get_current_user(request)
    assert user["wallet_address"] == "0x56b7ec62f1a23456789012345678901234567890"
    assert user["role"] == "JUDGE"

@pytest.mark.asyncio
async def test_get_current_user_hs256():
    """Verify standard HS256 tokens decode properly."""
    payload = {"sub": "0x1234567890abcdef1234567890abcdef12345678", "role": "LAWYER"}
    token = jwt.encode(payload, SECRET, algorithm="HS256")

    request = MagicMock()
    request.headers.get.return_value = f"Bearer {token}"

    user = await get_current_user(request)
    assert user["wallet_address"] == "0x1234567890abcdef1234567890abcdef12345678"
    assert user["role"] == "LAWYER"

@pytest.mark.asyncio
async def test_get_current_user_hs512():
    """Verify HS512 tokens decode properly."""
    payload = {"wallet_address": "0xabcdef1234567890abcdef1234567890abcdef12", "role": "CITIZEN"}
    token = jwt.encode(payload, SECRET, algorithm="HS512")

    request = MagicMock()
    request.headers.get.return_value = f"Bearer {token}"

    user = await get_current_user(request)
    assert user["wallet_address"] == "0xabcdef1234567890abcdef1234567890abcdef12"
    assert user["role"] == "CITIZEN"

@pytest.mark.asyncio
async def test_missing_auth_header_raises_or_mocks():
    request = MagicMock()
    request.headers.get.return_value = None

    if settings.allow_mock_auth:
        user = await get_current_user(request)
        assert user["wallet_address"] == "0xMockUserWalletAddress"
    else:
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request)
        assert exc_info.value.status_code == 401
