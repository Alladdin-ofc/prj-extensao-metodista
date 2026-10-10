import { getBytes, getMetadata, ref, uploadBytes } from 'firebase/storage';
import { fromByteArray } from 'base64-js';
import { auth, storage } from './firebaseConfig';

const MAX_BYTES = 5 * 1024 * 1024;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const assertOwner = (uid, path) => {
  if (!uid || auth.currentUser?.uid !== uid || path !== `avatars/${uid}.jpg`) throw new Error('avatar-access-denied');
};
const imageType = (bytes) => {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value)) return 'image/png';
  if ([82,73,70,70].every((value, i) => bytes[i] === value) && [87,69,66,80].every((value, i) => bytes[i + 8] === value)) return 'image/webp';
  throw new Error('invalid-avatar-image');
};

export const downloadAvatar = async (uid, path) => {
  assertOwner(uid, path);
  const reference = ref(storage, path);
  const metadata = await getMetadata(reference);
  if (!imageTypes.includes(metadata.contentType)) throw new Error('invalid-avatar-image');
  assertOwner(uid, path);
  const bytes = new Uint8Array(await getBytes(reference, MAX_BYTES));
  assertOwner(uid, path);
  if (!bytes.length || bytes.length > MAX_BYTES || imageType(bytes) !== metadata.contentType) throw new Error('invalid-avatar-image');
  return { uri: `data:${metadata.contentType};base64,${fromByteArray(bytes)}` };
};

export const uploadAvatar = async (uid, uri) => {
  const path = `avatars/${uid}.jpg`;
  assertOwner(uid, path);
  const response = await fetch(uri);
  const blob = await response.blob();
  const contentType = blob.type || 'image/jpeg';
  if (!imageTypes.includes(contentType) || !blob.size || blob.size > MAX_BYTES) throw new Error('invalid-avatar-image');
  assertOwner(uid, path);
  await uploadBytes(ref(storage, path), blob, { contentType });
  assertOwner(uid, path);
  return path;
};
