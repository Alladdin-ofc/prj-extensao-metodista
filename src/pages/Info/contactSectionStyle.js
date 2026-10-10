import styled from 'styled-components/native'

export const ContactSectionContainer = styled.ScrollView`
  height: 100%;
`

export const ContactSectionTitle = styled.Text`
  color: #22262b;
  font-weight: 700;
  font-size: 22px;
`

export const MapImage = styled.Image`
  width: 100%;
  border-radius: 8px;
  height: 200px;
  margin-top: 8px;
  margin-bottom: 20px;
`

export const AddressText = styled.Text`
  font-size: 16px;
  line-height: 23px;
  margin-bottom: 20px;
`

export const GoForButton = styled.TouchableOpacity`
  background-color: #1891E2;
  padding: 10px 20px;
  border-radius: 6px;
  align-items: center;
`

export const GoForButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;


export const ContactsContainer = styled.View`
  display: flex;
  flex-direction: column;
  margin-top: 40px;
  margin-bottom: 100px;
`

export const ContactItem = styled.TouchableOpacity`
  display: flex;
  flex-direction: row;
  gap: 14px;
  border: 1px solid gray;
  border-right-width: 0;
  border-left-width: 0;
  border-bottom-width: 0;
  align-items: center;
  min-height: 58px;
  padding: 10px 4px;
`

export const ContactValueText = styled.Text`
  flex: 1;
  color: #30353b;
  font-size: 14px;
`
