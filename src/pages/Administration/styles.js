import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f7f9' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#202328' },
  subtitle: { fontSize: 14, color: '#59616b', marginTop: 4 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  member: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#e5e8eb', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff' },
  memberCopy: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#202328' },
  email: { fontSize: 14, color: '#59616b', marginTop: 4 },
  role: { fontSize: 13, color: '#146e5a', marginTop: 6 },
  feedback: { padding: 24, alignItems: 'center', gap: 12 },
  message: { fontSize: 15, color: '#59616b', textAlign: 'center' },
  error: { fontSize: 15, color: '#a42332', textAlign: 'center' },
  loadMore: { padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  loadMoreText: { fontSize: 15, fontWeight: '600', color: '#167ec3' }
});
