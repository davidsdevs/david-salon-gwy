// Centralized Cloudinary configuration and upload helper
// Tries unsigned upload first using the provided preset. If the preset doesn't exist,
// falls back to a signed upload via the local signer endpoint.
import { Platform, NativeModules } from 'react-native';
import getConfig from '../config/production';

export const CLOUDINARY_CONFIG = {
  cloudName: 'du4q6vt4p',
  apiKey: '569674284946372',
  apiSecret: 'IbtgPhwuPWO6rho9O5BCdBazwTI',
  uploadPreset: 'faithconnect',
};

export const uploadImageToCloudinary = async (imageUri: string): Promise<string> => {
  // Attempt unsigned upload
  const unsignedForm = new FormData();
  unsignedForm.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile_image.jpg',
  } as any);
  unsignedForm.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  const unsignedResp = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    { method: 'POST', body: unsignedForm }
  );

  if (unsignedResp.ok) {
    const json = await unsignedResp.json();
    if (!json?.secure_url) throw new Error('Cloudinary upload did not return a secure_url');
    return json.secure_url as string;
  }

  const unsignedErr = await unsignedResp.text();
  const presetMissing = unsignedErr.includes('Upload preset not found');

  if (!presetMissing) {
    throw new Error(`Cloudinary upload failed: ${unsignedErr}`);
  }

  // Fallback: Signed upload via local signer endpoint
  const cfg = getConfig as any;
  const configured = cfg?.CLOUDINARY_SIGNER_URL ? [cfg.CLOUDINARY_SIGNER_URL] : [];

  // Try to derive LAN IP from dev bundle URL
  let lanUrl: string | undefined;
  try {
     const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
     if (scriptURL) {
       const match = scriptURL.match(/^https?:\/\/(.*?):(\d+)/);
       if (match && match[1]) {
         lanUrl = `http://${match[1]}:3001`;
       }
     }
  } catch {}

  const platformDefaults = Platform.select({
    android: ['http://10.0.2.2:3001', 'http://localhost:3001'],
    ios: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    web: ['http://localhost:3001'],
    default: ['http://localhost:3001'],
  }) as string[];

  const signerBases = [
    ...configured,
    ...(lanUrl ? [lanUrl] : []),
    ...platformDefaults,
  ].filter(Boolean);

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'faithconnect';
  let signature: string | undefined;
  let lastError: any;
  for (const base of signerBases) {
    try {
      const res = await fetch(`${base}/cloudinary-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: { timestamp, folder } }),
      });
      if (res.ok) {
        const json = await res.json();
        signature = json.signature;
        break;
      } else {
        lastError = await res.text();
      }
    } catch (e) {
      lastError = e;
    }
  }
  if (!signature) {
    throw new Error(`Failed to get Cloudinary signature from local signer. Ensure backend-server is running and reachable. Last error: ${String(lastError)}`);
  }

  const signedForm = new FormData();
  signedForm.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile_image.jpg',
  } as any);
  signedForm.append('api_key', CLOUDINARY_CONFIG.apiKey);
  signedForm.append('timestamp', String(timestamp));
  signedForm.append('signature', signature);
  signedForm.append('folder', folder);

  const signedResp = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    { method: 'POST', body: signedForm }
  );
  if (!signedResp.ok) {
    const errText = await signedResp.text();
    throw new Error(`Cloudinary signed upload failed: ${errText}`);
  }
  const signedJson = await signedResp.json();
  if (!signedJson?.secure_url) throw new Error('Cloudinary signed upload did not return a secure_url');
  return signedJson.secure_url as string;
};


