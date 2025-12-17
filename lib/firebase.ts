// Server-only Firebase Admin initialization helper
// Loads credentials from FIREBASE_SERVICE_ACCOUNT_JSON (preferred),
// FIREBASE_SERVICE_ACCOUNT_FILE/GOOGLE_APPLICATION_CREDENTIALS (file path), or ADC.

let initialized = false;

export function initFirebaseAdmin(): typeof import('firebase-admin') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require('firebase-admin') as typeof import('firebase-admin');
  
  if (!initialized) {
    if (!admin.apps || admin.apps.length === 0) {
      // Initialize with default credentials as fallback
      let cred: ReturnType<typeof admin.credential.cert> | ReturnType<typeof admin.credential.applicationDefault> = admin.credential.applicationDefault();
      // Note: Do NOT use NEXT_PUBLIC_ prefix for Firebase credentials - they are server-side only!
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      let filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      // If no file path specified, try to find common service account file names
      if (!filePath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs') as typeof import('fs');
        const path = require('path') as typeof import('path');
        const possibleFiles = [
          'firebase-service-account.json',
          'service-account.json',
          path.join(process.cwd(), 'firebase-service-account.json'),
          path.join(process.cwd(), 'service-account.json'),
        ];
        
        for (const possibleFile of possibleFiles) {
          if (fs.existsSync(possibleFile)) {
            filePath = possibleFile;
            break;
          }
        }
      }
      
      // Try to use env variable first, but fall back to file if it's invalid
      let usedEnvVar = false;
      if (raw) {
        try {
          let jsonString = raw.trim();
          
          // Skip if it looks like a malformed object (starts with '{' but has newlines/formatting issues)
          // This handles cases where someone pasted the JSON object directly into .env
          if (jsonString.startsWith('{') && (jsonString.includes('\n') || jsonString.includes(' = '))) {
            console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON appears to be malformed (contains newlines or "="). Falling back to file.');
            // Will fall through to file check below
          } else {
            // If it looks like it might be double-encoded (starts and ends with quotes), try parsing once
            if (jsonString.startsWith('"') && jsonString.endsWith('"') && jsonString.length > 2) {
              try {
                jsonString = JSON.parse(jsonString) as string;
              } catch {
                // Not double-encoded, continue with original
              }
            }
            
            const parsed = JSON.parse(jsonString) as Record<string, unknown>;
            cred = admin.credential.cert(parsed);
            usedEnvVar = true;
          }
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'JSON parse error';
          console.warn('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', errorMessage);
          console.warn('[Firebase] Falling back to file-based credentials...');
          // Will fall through to file check below
        }
      }
      
      // If env variable wasn't used (or wasn't provided), try file
      if (!usedEnvVar) {
        if (filePath) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fs = require('fs') as typeof import('fs');
            const path = require('path') as typeof import('path');
            const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
            
            if (fs.existsSync(resolvedPath)) {
              const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as Record<string, unknown>;
              cred = admin.credential.cert(data);
              console.log('[Firebase] Using credentials from file:', resolvedPath);
            } else {
              console.warn('[Firebase] Credentials file not found:', resolvedPath);
              console.warn('[Firebase] Falling back to Application Default Credentials...');
              cred = admin.credential.applicationDefault();
            }
          } catch (fileError: unknown) {
            const errorMessage = fileError instanceof Error ? fileError.message : 'File read error';
            console.error('[Firebase] Error reading credentials file:', errorMessage);
            console.warn('[Firebase] Falling back to Application Default Credentials...');
            cred = admin.credential.applicationDefault();
          }
        } else {
          // No file path found, use Application Default Credentials
          console.warn('[Firebase] No credentials file found. Using Application Default Credentials...');
          cred = admin.credential.applicationDefault();
        }
      }
      
      try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (!projectId) {
          console.warn('[Firebase] FIREBASE_PROJECT_ID not set. Firebase may not work correctly.');
        }
        
        admin.initializeApp({
          credential: cred,
          projectId: projectId,
        });
        console.log('[Firebase] Successfully initialized with project:', projectId || 'default');
      } catch (initError: unknown) {
        const errorMessage = initError instanceof Error ? initError.message : 'Unknown error';
        const errorStack = initError instanceof Error ? initError.stack : undefined;
        console.error('[Firebase] Initialization error:', errorMessage);
        if (errorStack) {
          console.error('[Firebase] Stack trace:', errorStack);
        }
        throw new Error(`Firebase initialization failed: ${errorMessage}`);
      }
    }
    initialized = true;
  }
  return admin;
}
