# DocuSign JWT Authentication Setup Guide

## Current Configuration Status

✅ **JWT Token Generation**: Working correctly  
✅ **Private Key**: Loaded and formatted correctly  
✅ **Keypair ID**: `88266e72-f296-47c2-931c-5cc458a7272d`  
✅ **User ID**: `f5dc398f-8c6f-4abe-956c-8b58a68f4107`  
❌ **Client ID Mismatch**: The client ID `sKY8MFMcR41` doesn't match the keypair

## Issue Analysis

The error "issuer_not_found" indicates that the client ID `sKY8MFMcR41` is not associated with the keypair ID `88266e72-f296-47c2-931c-5cc458a7272d` in your DocuSign account.

## Solution Options

### Option 1: Use the Original Client ID (Recommended)

Update your `docusign.env` file to use the client ID from your existing DocuSign project:

```env
DOCUSIGN_CLIENT_ID=4d3698b6-cf09-4204-8d0f-45f7da89de9e
DOCUSIGN_CLIENT_SECRET=2e490b30-332b-4563-83d6-299a74ef93ee
```

### Option 2: Create New Keypair for Current Client ID

1. Go to your DocuSign Developer Account
2. Navigate to your app with client ID `sKY8MFMcR41`
3. Go to "Service Integration" → "RSA Keypairs"
4. Generate a new RSA keypair
5. Update the `DOCUSIGN_KEYPAIR_ID` in your `docusign.env` file
6. Update the `DOCUSIGN_PRIVATE_KEY` with the new private key

### Option 3: Use OAuth2 Instead of JWT

If JWT continues to have issues, we can switch back to OAuth2 authentication using the client secret.

## Current Server Status

The DocuSign JWT server is running on port 3001 with the following endpoints:

- `GET /api/docusign/status` - Check authentication status
- `POST /api/docusign/send-for-signature` - Send documents for signature
- `GET /api/docusign/status/:envelopeId` - Check signature status
- `GET /api/docusign/download/:envelopeId` - Download signed documents

## Next Steps

1. **Choose Option 1** (use original client ID) for quickest resolution
2. **Test the connection** by visiting `http://localhost:3001/api/docusign/status`
3. **Verify authentication** works before proceeding with document signing

## Testing Commands

```bash
# Check server status
curl http://localhost:3001/api/health

# Check DocuSign authentication
curl http://localhost:3001/api/docusign/status
```

## Troubleshooting

If you continue to get authentication errors:

1. Verify the client ID exists in your DocuSign account
2. Check that the keypair ID matches the one in your DocuSign app
3. Ensure the user ID is correct for your DocuSign account
4. Verify the private key matches the public key in DocuSign

The JWT token generation is working correctly, so the issue is with the DocuSign account configuration, not the code.
