import sys
from unittest.mock import MagicMock

# Mock heavy dependencies before importing the client
sys.modules['aiohttp'] = MagicMock()
sys.modules['base58'] = MagicMock()
sys.modules['cryptography'] = MagicMock()
sys.modules['cryptography.hazmat'] = MagicMock()
sys.modules['cryptography.hazmat.primitives'] = MagicMock()
sys.modules['cryptography.hazmat.primitives.asymmetric'] = MagicMock()
sys.modules['cryptography.hazmat.primitives.asymmetric.ed25519'] = MagicMock()
sys.modules['dotenv'] = MagicMock()
sys.modules['src.api.schema_pb2'] = MagicMock()

from src.api.client import encode_varint, decode_varint

def test_encode_varint():
    """Test encoding integers to VarInt bytes."""
    # 0 maps to 0
    assert encode_varint(0) == b'\x00'

    # 1 maps to 1
    assert encode_varint(1) == b'\x01'

    # Values < 128 (0x80) fit in one byte
    assert encode_varint(127) == b'\x7f'

    # 128 (0x80) requires two bytes: MSB set on first byte, followed by 1
    assert encode_varint(128) == b'\x80\x01'

    # 300 requires two bytes
    assert encode_varint(300) == b'\xac\x02'

def test_decode_varint():
    """Test decoding VarInt bytes to integers and returning the new offset."""
    # Decoding 0
    val, offset = decode_varint(b'\x00')
    assert val == 0
    assert offset == 1

    # Decoding 1
    val, offset = decode_varint(b'\x01')
    assert val == 1
    assert offset == 1

    # Decoding 127
    val, offset = decode_varint(b'\x7f')
    assert val == 127
    assert offset == 1

    # Decoding 128
    val, offset = decode_varint(b'\x80\x01')
    assert val == 128
    assert offset == 2

    # Decoding 300
    val, offset = decode_varint(b'\xac\x02')
    assert val == 300
    assert offset == 2

    # Decoding with an initial offset
    # b'\xff\xff\x01' + b'\x80\x01' (128)
    # The first 3 bytes are just padding to test offset
    buffer = b'\xff\xff\x01\x80\x01\x00'
    val, offset = decode_varint(buffer, offset=3)
    assert val == 128
    assert offset == 5

def test_varint_roundtrip():
    """Test that encode -> decode recovers the original value and offset matches encoded length."""
    test_values = [
        0, 1, 127, 128, 255, 256, 300, 1000,
        16383, 16384, 65535, 65536,
        2**31 - 1, 2**31,
        2**63 - 1
    ]

    for val in test_values:
        encoded = encode_varint(val)
        decoded_val, offset = decode_varint(encoded)

        assert decoded_val == val, f"Roundtrip failed for {val}"
        assert offset == len(encoded), f"Offset mismatch for {val}: expected {len(encoded)}, got {offset}"
