import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


// Aqui estou pegando qual o sistema operacional do celular
const SO = Platform.OS;

// importando a base do styled components, biblioteca utilizada para estilização dos componentes do app
import styled, { css } from "styled-components/native";

// utilizando o SafeAreaView, componente que delimita automaticamente o tamanho da tela, no caso do android não funciona corretamente, então existe a verificação, caso seja android um espaçamento interno de 40px é aplicado
export const SafeAreaViewComponent = styled(SafeAreaView)`
  flex: 1;
  width: 100%;
  max-width: 480px;
  align-self: center;
  background-color: white;
`;


export const TabBarIconButton = styled.View`
  background-color: ${({ isFocused }) => (isFocused ? '#CDE2F0' : 'transparent')};
  padding: ${({ isFocused }) => (isFocused ? '12px' : '0px')};
  border-radius: 9999px;
  ${({ isFocused }) =>
    isFocused &&
    css`
      transform: translateY(-20px);
    `}
`;
