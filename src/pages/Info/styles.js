import styled from "styled-components/native";

// Aqui são feitas todas as estlizações feitas para a tela de Home
export const HomeContainer = styled.View`
  flex: 1;
  width: 100%;
  background-color: #f7f8fa;
`

export const ScreenHeader = styled.View`
  display: flex;
  flex-direction: row;
  align-items:  center;
  padding-horizontal: 18px;
  width: 100%;
  min-height: 62px;
  justify-content: space-between;
  background-color: #ffffff;
  border-bottom-width: 1px;
  border-bottom-color: #e3e6e9;
`;


export const HeaderTitle = styled.Text`
  color: #202328;
  font-size: 16px;
  font-weight: 700;
`

export const LogoImage = styled.Image`
  height: 42px;
  width: 42px;
  resize-mode: contain;
`


export const MenuContainer = styled.View`
  flex: 1;
`

export const MenuSrc = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  gap: 24px;
  padding: 0 20px;
  background-color: #fff;
  border-bottom-width: 1px;
  border-bottom-color: #e3e6e9;
`

export const MenuItem = styled.TouchableOpacity`
  min-height: 46px;
  justify-content: center;
  border-bottom-width: ${({ isSelected }) => isSelected ? '2px' : '0px'};
  border-bottom-color: #1689d6;
`

export const MenuItemLabel = styled.Text`
  color: #${({ isSelected }) => isSelected ? '167ec3' : '4d535a'};
  font-size: 14px;
  font-weight: ${({ isSelected }) => isSelected ? '700' : '500'};
`

export const MenuContent = styled.ScrollView`
  padding: 18px 20px;
`

