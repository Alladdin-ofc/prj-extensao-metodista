// importando os componentes do react native
import { Pressable, Text, StyleSheet } from "react-native"


// Definindo o componente de Button para aplicação
// Recebendo a prop type, label e onPress
export const Button = ({ type, label, onPress, disabled, style }) => {
  return (
    <Pressable
      accessibilityRole="button"
      // para aplicar o estilo do botão, é verificado seu tipo, se é primario ou secundario
      style={[
        type === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        style
      ]}

      // passando a propriedade onPress recebida via parametros para o método onPress do botão
      onPress={onPress}
      disabled={disabled}
    >
      {/* para aplicar o estilo do texto do botão, é verificado seu tipo, se é primario ou secundario */}
      <Text style={type === 'primary' ? styles.textPrimary : styles.textSecondary}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  buttonPrimary: {
    backgroundColor: '#1689D6',
    display: 'flex',
    justifyContent: 'center',
    color: 'white',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '100%',
    minHeight: 48
  },
  buttonSecondary: {
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderColor: '#25282c',
    borderWidth: 1,
    width: '100%',
    minHeight: 48
  },
  textPrimary: {
    color: 'white',
    // fontSize: '16',
    fontWeight: 'bold'
  },
  textSecondary: {
    color: '#25282c',
    // fontSize: '16',
    fontWeight: 'bold'
  },
  buttonDisabled: {
    opacity: 0.5
  }
});
