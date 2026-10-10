import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './firebaseConfig';

const functions = getFunctions(auth.app, 'southamerica-east1');
const roles = ['member', 'admin', 'master'];
const validUid = (uid) => typeof uid === 'string' && /^[^\s/]{1,128}$/.test(uid);
const invalidResponse = () => Object.assign(new Error('invalid-server-response'), { code: 'functions/data-loss' });

export const listMembersForAdministration = async ({ pageSize = 30, pageToken } = {}) => {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50 ||
      (pageToken !== undefined && (typeof pageToken !== 'string' || !pageToken || pageToken.length > 2048))) {
    throw new Error('invalid-pagination');
  }
  const payload = { pageSize };
  if (pageToken) payload.pageToken = pageToken;
  const { data } = await httpsCallable(functions, 'listMembersForAdministration')(payload);
  if (!Array.isArray(data?.members) || data.members.length > pageSize ||
      (data.nextPageToken != null && typeof data.nextPageToken !== 'string')) throw invalidResponse();
  const members = data.members.map((item) => {
    if (!validUid(item?.uid) || !roles.includes(item.role)) throw invalidResponse();
    return {
      uid: item.uid,
      name: typeof item.name === 'string' ? item.name : '',
      email: typeof item.email === 'string' ? item.email : '',
      role: item.role
    };
  });
  return { members, nextPageToken: data.nextPageToken || null };
};

export const setMemberRole = async ({ uid, role }) => {
  if (!validUid(uid) || !roles.includes(role)) throw new Error('invalid-role-change');
  const { data } = await httpsCallable(functions, 'setMemberRole')({ uid, role });
  if (data?.uid !== uid || data.role !== role) throw invalidResponse();
  return { uid, role };
};
