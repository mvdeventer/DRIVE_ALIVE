"""
Test using the official fastapi-payfast package.
This will show us the correct way to generate signatures.
"""

from fastapi_payfast import PayFastClient, PayFastConfig, PayFastPaymentData

# PayFast sandbox credentials
config = PayFastConfig(
    merchant_id="10000100",
    merchant_key="46f0cd694581a",
    passphrase="",  # Try with empty passphrase first
    sandbox=True,
)

payfast = PayFastClient(config)

# Create payment data
payment_data = PayFastPaymentData(
    merchant_id=config.merchant_id,
    merchant_key=config.merchant_key,
    amount=100.00,
    item_name="Test Item",
    return_url="https://www.example.com/success",
    cancel_url="https://www.example.com/cancel",
    notify_url="https://www.example.com/notify",
    name_first="John",
    name_last="Doe",
    email_address="john@example.com",
)

print("=" * 80)
print("USING OFFICIAL FASTAPI-PAYFAST PACKAGE")
print("=" * 80)

# Generate payment response
response = payfast.generate_payment_response(payment_data)

print(f"\nPayment URL: {response.get('url', 'N/A')}")
print(f"Payment Data: {response}")

# Check the signature generation method
print("\n" + "=" * 80)
print("SIGNATURE ANALYSIS")
print("=" * 80)

# Let's inspect the package's signature generation
import inspect

from fastapi_payfast.utils import generate_signature

source = inspect.getsource(generate_signature)
print("\nSignature generation function from package:")
print(source)
