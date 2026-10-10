import styled from 'styled-components/native';

export const RocketContainer = styled.ScrollView`
  flex: 1;
  width: 100%;
  background-color: #f7f8fa;
`;

export const HeaderContainer = styled.View`
  width: 100%;
  padding: 28px 22px 22px;
  background-color: #ffffff;
  align-items: center;
  border-bottom-width: 1px;
  border-bottom-color: #e4e7ea;
`;

export const PageTitle = styled.Text`
  color: #202328;
  font-size: 25px;
  font-weight: 700;
  text-align: center;
  margin-top: 10px;
`;

export const SubTitle = styled.Text`
  max-width: 340px;
  color: #535a62;
  font-size: 14px;
  line-height: 21px;
  margin-top: 5px;
  text-align: center;
`;

export const PixCard = styled.View`
  background-color: #ffffff;
  margin: 22px 20px 14px;
  padding: 20px;
  border-radius: 8px;
  border-width: 1px;
  border-color: #e1e5e8;
`;

export const PixLabel = styled.Text`
  flex: 1;
  color: #3f464e;
  font-size: 14px;
  font-weight: 600;
  margin-left: 9px;
`;

export const PixKey = styled.Text`
  color: #202328;
  font-size: 19px;
  font-weight: 700;
  margin-top: 16px;
  margin-bottom: 14px;
  line-height: 26px;
`;

export const VerseContainer = styled.View`
  margin: 8px 20px 24px;
  padding: 16px 18px;
  background-color: #e7f2f8;
  border-radius: 8px;
`;

export const VerseText = styled.Text`
  color: #31434f;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
`;
