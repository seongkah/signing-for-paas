# Task 6: Authentication Pages and User Management - User Guide

## Overview

This guide covers the complete authentication system and user management features implemented in Task 6 of the TikTok Signing PaaS platform. The system provides secure user registration, login, password management, and a comprehensive dashboard for account and API key management.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Registration](#user-registration)
3. [User Login](#user-login)
4. [Password Management](#password-management)
5. [User Dashboard](#user-dashboard)
6. [API Key Management](#api-key-management)
7. [Technical Implementation](#technical-implementation)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Valid email address for account verification
- Internet connection for email confirmation

### Accessing the Platform

1. Navigate to the TikTok Signing PaaS homepage
2. You'll see options to "Sign In" or "Get Started"
3. New users should click "Get Started" to create an account
4. Existing users can click "Sign In" to access their dashboard

## User Registration

### Creating a New Account

1. **Navigate to Registration**
   - Click "Get Started" from the homepage
   - Or go directly to `/auth/register`

2. **Fill Out Registration Form**
   - **Email**: Enter a valid email address
   - **Password**: Create a password (minimum 6 characters)
   - **Confirm Password**: Re-enter your password for verification

3. **Form Validation**
   - Email must be in valid format (user@domain.com)
   - Password must be at least 6 characters long
   - Passwords must match exactly
   - All fields are required

4. **Submit Registration**
   - Click "Create account" button
   - System will send a confirmation email
   - Check your email inbox (and spam folder)

5. **Email Confirmation**
   - Open the confirmation email
   - Click the verification link
   - You'll be redirected to the dashboard upon successful verification

### Registration Validation Rules

- **Email**: Must be a valid email format
- **Password**: Minimum 6 characters (recommended: use mix of letters, numbers, symbols)
- **Confirm Password**: Must exactly match the password field

## User Login

### Signing Into Your Account

1. **Navigate to Login**
   - Click "Sign In" from the homepage
   - Or go directly to `/auth/login`

2. **Enter Credentials**
   - **Email**: Your registered email address
   - **Password**: Your account password

3. **Submit Login**
   - Click "Sign in" button
   - Upon successful authentication, you'll be redirected to your dashboard

### Login Features

- **Remember Session**: Your login session persists across browser sessions
- **Automatic Redirect**: Authenticated users are automatically redirected to dashboard
- **Error Handling**: Clear error messages for invalid credentials

## Password Management

### Forgot Password

1. **Access Password Reset**
   - From login page, click "Forgot your password?"
   - Or go directly to `/auth/forgot-password`

2. **Request Reset Link**
   - Enter your registered email address
   - Click "Send reset link"
   - Check your email for the reset link

3. **Reset Your Password**
   - Click the reset link in your email
   - You'll be taken to `/auth/reset-password`
   - Enter your new password
   - Confirm the new password
   - Click "Update password"

### Password Reset Validation

- **New Password**: Minimum 6 characters
- **Confirmation**: Must match the new password exactly
- **Reset Link**: Valid for a limited time (check email for expiration)

## User Dashboard

### Dashboard Overview

The dashboard (`/dashboard`) is your central hub for account management and API operations.

### Dashboard Sections

#### 1. Account Information
- **Email**: Your registered email address
- **Account Tier**: Current subscription level (free/api_key)
- **Member Since**: Account creation date

#### 2. Usage Statistics
- **Requests This Month**: Total API calls made
- **Success Rate**: Percentage of successful requests
- **Average Response Time**: Performance metrics

#### 3. API Keys Management
- **Create New Keys**: Generate API keys for your applications
- **View Existing Keys**: See all your active API keys
- **Delete Keys**: Remove unused or compromised keys

#### 4. Quick Start Guide
- **API Endpoint**: Direct link to signature generation endpoint
- **Example Request**: Copy-paste cURL example
- **Integration Help**: Basic usage instructions

### Dashboard Navigation

- **Sign Out**: Click the "Sign Out" button in the top-right corner
- **Refresh Data**: Page automatically loads latest information
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## API Key Management

### Creating API Keys

1. **Navigate to API Keys Section**
   - Scroll to "API Keys" section in dashboard
   - Find "Create New API Key" area

2. **Name Your Key**
   - Enter a descriptive name (e.g., "Production Server", "Development")
   - Names help you identify keys later

3. **Generate Key**
   - Click "Create Key" button
   - **Important**: Copy the generated key immediately
   - Keys are only shown once for security

4. **Store Securely**
   - Save the API key in a secure location
   - Never share keys publicly or commit to version control

### Managing Existing Keys

#### Viewing Keys
- All active keys are listed with:
  - Key name
  - Creation date
  - Last used date
  - Key ID (for reference)

#### Deleting Keys
- Click "Delete" button next to any key
- Confirm deletion in the popup
- **Warning**: Deleted keys cannot be recovered
- Applications using deleted keys will receive authentication errors

### API Key Security Best Practices

1. **Use Descriptive Names**: Help identify key purposes
2. **Regular Rotation**: Periodically create new keys and delete old ones
3. **Principle of Least Privilege**: Create separate keys for different applications
4. **Monitor Usage**: Check "Last used" dates to identify unused keys
5. **Immediate Deletion**: Remove compromised keys immediately

## Technical Implementation

### Authentication Flow

1. **Registration**: User creates account → Email verification → Account activation
2. **Login**: Credentials verification → Session creation → Dashboard access
3. **Session Management**: Persistent sessions with automatic refresh
4. **Logout**: Session termination and cleanup

### Security Features

- **Password Hashing**: Secure password storage using Supabase Auth
- **Email Verification**: Required for account activation
- **Session Management**: Secure token-based authentication
- **HTTPS Only**: All authentication endpoints use secure connections
- **Rate Limiting**: Protection against brute force attacks

### Form Validation

- **Client-Side**: Immediate feedback using React Hook Form + Zod
- **Server-Side**: Additional validation on all endpoints
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during form submission

## Troubleshooting

### Common Issues and Solutions

#### Registration Problems

**Issue**: "Email already exists"
- **Solution**: Use the login page instead, or try password reset if you forgot your password

**Issue**: "Passwords don't match"
- **Solution**: Ensure both password fields contain exactly the same text

**Issue**: "Email confirmation not received"
- **Solutions**:
  - Check spam/junk folder
  - Wait a few minutes for delivery
  - Ensure email address was entered correctly
  - Try registering again with correct email

#### Login Problems

**Issue**: "Invalid credentials"
- **Solutions**:
  - Verify email address is correct
  - Check password (case-sensitive)
  - Use password reset if you forgot your password
  - Ensure account was verified via email

**Issue**: "Account not verified"
- **Solution**: Check email for verification link and click it

#### Dashboard Issues

**Issue**: "Unable to load user data"
- **Solutions**:
  - Refresh the page
  - Check internet connection
  - Try logging out and back in
  - Contact support if issue persists

#### API Key Problems

**Issue**: "Failed to create API key"
- **Solutions**:
  - Ensure you're logged in
  - Check if you've reached key limit
  - Try refreshing the page
  - Contact support for account issues

**Issue**: "API key not working"
- **Solutions**:
  - Verify key was copied correctly (no extra spaces)
  - Check if key was deleted
  - Ensure proper Authorization header format
  - Verify API endpoint URL

### Getting Help

If you encounter issues not covered in this guide:

1. **Check Browser Console**: Look for error messages (F12 → Console)
2. **Try Different Browser**: Rule out browser-specific issues
3. **Clear Cache**: Clear browser cache and cookies
4. **Contact Support**: Reach out with specific error messages and steps to reproduce

### Browser Compatibility

**Supported Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features**:
- JavaScript enabled
- Cookies enabled
- Local storage available

## Best Practices

### Account Security

1. **Strong Passwords**: Use complex passwords with mixed characters
2. **Unique Passwords**: Don't reuse passwords from other services
3. **Regular Updates**: Change passwords periodically
4. **Secure Email**: Keep your email account secure (it's used for password resets)

### API Key Management

1. **Environment Variables**: Store keys in environment variables, not code
2. **Key Rotation**: Regularly create new keys and retire old ones
3. **Monitoring**: Track key usage and delete unused keys
4. **Separation**: Use different keys for different environments (dev/staging/prod)

### Usage Monitoring

1. **Regular Checks**: Monitor your usage statistics
2. **Performance Tracking**: Watch response times and success rates
3. **Quota Management**: Stay aware of your usage limits
4. **Error Monitoring**: Investigate failed requests

## Conclusion

The TikTok Signing PaaS authentication system provides a secure, user-friendly way to manage your account and API access. With proper setup and following the best practices outlined in this guide, you'll have a robust foundation for integrating with the signature generation service.

For additional technical documentation, refer to the API documentation and integration guides available in the platform.