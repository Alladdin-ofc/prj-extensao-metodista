import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Modal from 'react-native-modal';
import { Button } from '../Button';
import { EVENT_CATEGORIES } from '../../services/eventService';

const maskDate = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const maskTime = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

const getInitialDate = () => {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export function EventFormModal({ visible, onClose, onSubmit, saving }) {
  const { height } = useWindowDimensions();
  const modalMaxHeight = Math.max(160, height - 80);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getInitialDate());
  const [time, setTime] = useState('19:00');
  const [category, setCategory] = useState('eventos');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setDate(getInitialDate());
      setTime('19:00');
      setCategory('eventos');
    }
  }, [visible]);

  const submit = () => onSubmit({ title, description, date, time, category });

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} onBackButtonPress={onClose} avoidKeyboard>
      <KeyboardAvoidingView style={{ maxHeight: modalMaxHeight }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" style={[styles.modal, { maxHeight: modalMaxHeight }]} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Adicionar à agenda</Text>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex.: Culto de celebração" placeholderTextColor="#777d85" />
          <Text style={styles.label}>Descrição</Text>
          <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Informações para a comunidade" placeholderTextColor="#777d85" multiline />
          <View style={styles.splitRow}>
            <View style={styles.splitField}>
              <Text style={styles.label}>Data</Text>
              <TextInput style={styles.input} value={date} onChangeText={(value) => setDate(maskDate(value))} placeholder="dd/mm/aaaa" placeholderTextColor="#777d85" keyboardType="numeric" maxLength={10} />
            </View>
            <View style={styles.splitField}>
              <Text style={styles.label}>Horário</Text>
              <TextInput style={styles.input} value={time} onChangeText={(value) => setTime(maskTime(value))} placeholder="19:00" placeholderTextColor="#777d85" keyboardType="numeric" maxLength={5} />
            </View>
          </View>
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categoryRow}>
            {EVENT_CATEGORIES.map((item) => (
              <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.category, category === item.id && styles.categorySelected]}>
                <Text style={[styles.categoryText, category === item.id && styles.categoryTextSelected]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            <Button label={saving ? 'Publicando...' : 'Publicar evento'} type="primary" onPress={submit} disabled={saving || !title.trim()} />
            <Button label="Cancelar" type="secondary" onPress={onClose} disabled={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: '#fff', borderRadius: 8 },
  content: { padding: 22, gap: 8 },
  title: { color: '#202328', fontSize: 21, fontWeight: '700', marginBottom: 8 },
  label: { color: '#34383d', fontSize: 14, fontWeight: '600', marginTop: 6 },
  input: { borderColor: '#d7dbe0', borderWidth: 1, borderRadius: 6, minHeight: 46, paddingHorizontal: 12, color: '#202328', fontSize: 15 },
  multiline: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  splitRow: { flexDirection: 'row', gap: 12 },
  splitField: { flex: 1 },
  categoryRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  category: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: '#cfd4d9', borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  categorySelected: { backgroundColor: '#d9edf8', borderColor: '#1689d6' },
  categoryText: { color: '#484d53', fontSize: 12 },
  categoryTextSelected: { color: '#126fae', fontWeight: '700' },
  actions: { gap: 8, marginTop: 12 }
});
