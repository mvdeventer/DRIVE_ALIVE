"""
Test email sending with app password
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.email_service import EmailService

# Load credentials from environment variables — never hardcode these!
email = os.environ.get('TEST_SMTP_EMAIL', '')
app_password = os.environ.get('TEST_SMTP_PASSWORD', '')
recipient = os.environ.get('TEST_SMTP_RECIPIENT', email)

if not email or not app_password:
    print('❌  Set TEST_SMTP_EMAIL and TEST_SMTP_PASSWORD environment variables before running this script.')
    sys.exit(1)

print('\n' + '=' * 80)
print('📧 TESTING EMAIL WITH PROVIDED APP PASSWORD')
print('=' * 80)
print()
print(f'From: {email}')
print(f'To: {recipient}')
print(f'App Password: {app_password}')
print()
print('⏳ Sending test email...\n')

try:
    email_service = EmailService(smtp_email=email, smtp_password=app_password)
    result = email_service.send_test_email(to_email=recipient)
    
    if result:
        print('✅ ✅ ✅ EMAIL SENT SUCCESSFULLY! ✅ ✅ ✅')
        print()
        print(f'   From: {email}')
        print(f'   To: {recipient}')
        print(f'   Subject: Test Email - Driving School SMTP Configuration')
        print()
        print('📌 Check your inbox for the test email!')
        print()
        print('=' * 80)
        print('✅ GMAIL SMTP IS NOW CONFIGURED AND WORKING!')
        print('=' * 80)
        print()
        print('Next steps:')
        print('1. Go to SetupScreen in the app')
        print('2. Enter your SMTP email address')
        print('3. Enter your Gmail app password (see Google Account > Security > App Passwords)')
        print('4. Set link validity: 30 minutes')
        print('5. Click "Test Email" to verify')
        print()
    else:
        print('❌ EMAIL FAILED TO SEND')
        print('   Check Gmail app password and settings')
        
except Exception as e:
    print(f'❌ ERROR: {str(e)}')
    import traceback
    traceback.print_exc()

print()
