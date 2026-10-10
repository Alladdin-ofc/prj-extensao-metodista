import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: '#fff' },
  page: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  logo: { width: 52, height: 52 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: '#202328', fontSize: 23, fontWeight: '700' },
  subtitle: { color: '#5f666e', fontSize: 13, marginTop: 3 },
  backButton: { minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: '#d1d5da', borderRadius: 6, justifyContent: 'center' },
  backText: { color: '#3f454b', fontSize: 13, fontWeight: '600' },
  avatarPicker: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: '#cbd1d7', backgroundColor: '#f7f8fa', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 20 },
  avatar: { width: '100%', height: '100%' },
  avatarLabel: { color: '#4f5962', fontSize: 10, marginTop: 3 },
  field: { marginBottom: 13, flex: 1 },
  label: { color: '#34383d', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#d7dbe0', borderRadius: 6, paddingHorizontal: 12, color: '#202328', fontSize: 15, backgroundColor: '#fff' },
  segmentedRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  segment: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cdd2d8', borderRadius: 21 },
  segmentSelected: { borderColor: '#1689d6', backgroundColor: '#dceef8' },
  segmentText: { color: '#4d535a', fontSize: 14 },
  segmentTextSelected: { color: '#126fae', fontWeight: '700' },
  cityRow: { flexDirection: 'row', gap: 12 },
  cityField: { flex: 1 },
  stateField: { width: 82 },
  actions: { marginTop: 7, gap: 12 },
  privacyNote: { color: '#646b73', fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 }
});
