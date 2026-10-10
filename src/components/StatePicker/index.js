import React from 'react';
import { Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BRAZILIAN_STATES } from '../../services/brazilianStates';
import styles from './styles';

export default function StatePicker({ value, onValueChange, enabled = true }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Estado (UF)</Text>
      <View style={styles.control}>
        <Picker
          accessibilityLabel="Estado (UF)"
          selectedValue={value}
          onValueChange={onValueChange}
          enabled={enabled}
          mode="dialog"
          prompt="Estado (UF)"
          style={styles.picker}
          itemStyle={styles.item}
        >
          <Picker.Item label="Selecionar estado" value="" style={styles.item} />
          {BRAZILIAN_STATES.map(state => (
            <Picker.Item key={state.uf} label={`${state.uf} - ${state.name}`} value={state.uf} style={styles.item} />
          ))}
        </Picker>
      </View>
    </View>
  );
}
