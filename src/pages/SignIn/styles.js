import styled from 'styled-components/native';

export const SignInContainer = styled.View`
  flex: 1;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 26px 24px;
  background-color: #ffffff;
`;

export const HeaderContainer = styled.View`
  width: 100%;
  max-width: 420px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
`;

export const HeaderTitle = styled.Text`
  color: #202328;
  font-size: 23px;
  font-weight: 700;
  flex: 1;
`;

export const CancelButton = styled.TouchableOpacity`
  min-height: 40px;
  padding: 8px 14px;
  border-color: #cfd4d9;
  border-radius: 6px;
  border-width: 1px;
  justify-content: center;
`;

export const FormContainer = styled.View`
  width: 100%;
  max-width: 420px;
  gap: 14px;
`;

export const FormItem = styled.View`
  min-height: 52px;
  width: 100%;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

export const FormIcon = styled.View`
  width: 28px;
  align-items: center;
  justify-content: center;
`;

export const FormInput = styled.TextInput`
  flex: 1;
  min-width: 0;
  min-height: 48px;
  border-color: #d7dbe0;
  border-width: 1px;
  border-radius: 6px;
  padding: 12px;
  font-size: 15px;
  color: #202328;
`;

export const SrcContainer = styled.View`
  width: 100%;
  max-width: 420px;
  align-items: stretch;
  margin-top: 24px;
`;
