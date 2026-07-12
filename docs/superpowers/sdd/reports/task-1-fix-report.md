# Task 1 Fix Report

## What was fixed

### 1. Pinned latest versions in package.json
- "next": "latest" -> "next": "^14.2.0"
- "react": "latest" -> "react": "^18.2.0"
- "react-dom": "latest" -> "react-dom": "^18.2.0"

### 2. Added .dockerignore
Created file with exclusions for: node_modules/, .next/, .git/, .env*, *.log, data/

### 3. Added Jest config for Next.js
Created jest.config.js using next/jest configuration helper.

### 4. Added restart policy to docker-compose.yml
Added restart: unless-stopped under the app service (after the build: line).

## Git status after fixes
- Working tree clean
- All changes committed in amended commit 0f1a45a
- Branch: master

## Files staged and committed
- package.json
- .dockerignore
- jest.config.js
- docker-compose.yml

## Issues
- None. All changes applied and verified successfully.