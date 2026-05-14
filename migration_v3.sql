-- Migration Script for Forgot Password

ALTER TABLE users ADD COLUMN reset_password_token TEXT;
ALTER TABLE users ADD COLUMN reset_password_expires DATETIME;
