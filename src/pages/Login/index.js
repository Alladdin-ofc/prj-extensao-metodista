
import React, { useContext, useEffect } from 'react';
// Importando o componente de delimitação de tela
import { SafeAreaViewComponent } from "../../styles";

// Importando os componentes estilizados
import { 
  Body, 
  HomeContainer, 
  SrcContainer, 
  ButtonsContainer, 
  GuestButtonText, 
  GuestButton, 
  InfoContainer, 
  LogoImage,
  Title,
  SliderBody,
  SliderText
} from "./styles";

// Importando o componente de botão padrão para a aplicação
import { Button } from "../../components/Button";

// Importando a logo da metodista
import LogoImageSrc from '../../../assets/MetodistaLogo.png'

// Importando o componente de swiper para mostrar os textos
import Swiper from 'react-native-swiper';

// Importando o componente de estilização do próprio react native
import { Platform, StyleSheet, View } from 'react-native'
import { AuthContext } from '../../context/AuthContext';


// aqui é definido o componente de Home e pegando a propriedade navigation presente para poder fazer a navegação entre telas
export default function Home({ navigation }){
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && navigation.isFocused()) navigation.navigate('Home');
  }, [navigation, user]);

  // definidos os textos que vão ser mostrados no swiper
  const sliderTexts = [
    "Venha fazer parte dessa comunidade!",
    "Descubra mais sobre a Igreja",
    "Metodista em Santana de Parnaíba"
  ]

  return (
    <SafeAreaViewComponent>
      <HomeContainer>
        <Body>
            <InfoContainer>
              {/* Aqui é passado o import da logo para dentro do componente de imagem */}
              <LogoImage source={LogoImageSrc}/>
              <Title>Bem-vindo!</Title>
            
              <View style={styles.swiper}>
              <Swiper height={128} loop={Platform.OS !== 'web'} dotColor="#c7ccd1" activeDotColor="#c92834" autoplay={Platform.OS !== 'web'} autoplayTimeout={5}>
                {/* Mapeando os itens do array sliderTexts, funciona basicamente como um forEach, mas possui um retorno de um array. No react pode ser feito isso para diminuir repetição de código */}
               {sliderTexts.map((item, index) => (
                 <SliderBody key={index}>
                   <SliderText>{item}</SliderText>
                 </SliderBody>
               ))}
             </Swiper>
              </View>

           </InfoContainer> 
           <SrcContainer>
            <ButtonsContainer>
              <Button label={'Entrar'} type='secondary' style={{ flex: 1, width: 'auto' }} onPress={() => navigation.navigate('SignIn')}/>
              <Button 
                label={'Cadastre-se'} 
                type='primary' 
                style={{ flex: 1, width: 'auto' }}
                onPress={() => navigation.navigate('Register')}
              />
            </ButtonsContainer>
            <GuestButton onPress={() => navigation.navigate('Home')}>
              <GuestButtonText>
                Continue como convidado
              </GuestButtonText>
            </GuestButton>
          </SrcContainer>
        </Body>
      </HomeContainer>
    </SafeAreaViewComponent>
  )
}



const styles = StyleSheet.create({
  swiper: {
    flexShrink: 0,
    width: '100%',
    height: 128,
    marginTop: 14
  }
})
