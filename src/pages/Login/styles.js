import styled from 'styled-components/native';
import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const HomeContainer = styled.View`
  flex: 1;
  width: 100%;
  background-color: #ffffff;
  align-items: center;
`;

export const Body = styled.View`
  flex: 1;
  width: 100%;
  max-width: 480px;
  padding: ${isAndroid ? '20px 24px 22px' : '28px 24px 22px'};
  align-items: center;
  justify-content: space-between;
`;

export const InfoContainer = styled.View`
  width: 100%;
  flex: 1;
  align-items: center;
  justify-content: center;
`;

export const LogoImage = styled.Image`
  width: 132px;
  height: 132px;
  resize-mode: contain;
  margin-bottom: 18px;
`;

export const Title = styled.Text`
  color: #202328;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  max-width: 340px;
`;

export const SliderBody = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 8px;
`;

export const SliderText = styled.Text`
  color: #555c64;
  font-size: 15px;
  text-align: center;
  line-height: 22px;
`;

export const SrcContainer = styled.View`
  width: 100%;
  gap: 14px;
  align-items: center;
`;

export const ButtonsContainer = styled.View`
  width: 100%;
  flex-direction: row;
  gap: 10px;
`;

export const GuestButton = styled.TouchableOpacity`
  min-height: 44px;
  justify-content: center;
`;

export const GuestButtonText = styled.Text`
  color: #515860;
  font-size: 14px;
  text-decoration-line: underline;
`;
