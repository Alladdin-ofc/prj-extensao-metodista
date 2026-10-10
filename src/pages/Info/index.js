import { SafeAreaViewComponent } from "../../styles";
import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, View, Linking, TextInput, Alert, TouchableOpacity, Text, Platform, KeyboardAvoidingView } from 'react-native';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { AuthContext } from '../../context/AuthContext';
import { useSessionScope } from '../../context/useSessionScope';
import Modal from 'react-native-modal';
import { Button } from "../../components/Button";

import {
  HeaderTitle,
  HomeContainer,
  LogoImage,
  MenuContainer,
  MenuContent,
  MenuItem,
  MenuItemLabel,
  MenuSrc,
  ScreenHeader,
} from "./styles";

import { 
  UsSectionContainer,
  UsSectionImage,
  UsSectionSinceText,
  UsSectionTitle,
  UsSectionContentText,
  ReadMoreButton,
  ReadMoreButtonText,
  PastorSection,
  PastorImage,
  PastorTextContainer
} from "./usSectionStyle";

import LogoImageSrc from '../../../assets/MetodistaLogo.png'
import NosImagem from '../../../assets/NosImagem.jpg'
import Pastor from '../../../assets/pastor.jpg'
import Location from '../../../assets/Location.png'

import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Entypo from '@expo/vector-icons/Entypo';
import { Ionicons } from '@expo/vector-icons';

import { 
  AddressText,
  ContactItem,
  ContactsContainer,
  ContactSectionContainer, 
  ContactSectionTitle, 
  ContactValueText, 
  GoForButton, 
  GoForButtonText, 
  MapImage
} from "./contactSectionStyle";
import { AboutSectionContainer, AboutSectionContentText, AboutSectionImage, AboutSectionTitle } from "./aboutSectionStyle";

const DEFAULT_HISTORY = 'O trabalho metodista em Santana de Parnaíba teve início a partir da visão missionária de Domitila Ladeia Gomes, membro da Igreja Metodista em Itaberaba. Em outubro de 1994, ao ler na estrada uma placa com o nome do município, ela guardou aquela cidade em seu coração e foi visitá-la com Ruth Beloni.';
const DEFAULT_ABOUT = 'A Igreja Metodista em Santana de Parnaíba é uma comunidade dedicada ao amor a Deus e ao próximo, compartilhando os princípios bíblicos de santidade, amor e graça. Sua história na cidade continua sendo construída com a participação da comunidade. Venha fazer parte dessa história!';
const DEFAULT_MISSION = 'Salvar almas para Cristo!';
const DEFAULT_PASTOR = 'Conheça nosso dedicado pastor, que traz mensagens inspiradoras todos os domingos. Saiba sobre sua jornada, valores, e visão para nossa igreja';

export default function Info({ navigation }){
  const { isAdmin, user } = useContext(AuthContext);

  const endereco = "R. Canário, 41 - Jardim Deghi, Santana de Parnaíba - SP, 06502-175";

  const [history, setHistory] = useState(DEFAULT_HISTORY);
  const [about, setAbout] = useState(DEFAULT_ABOUT);
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [pastorText, setPastorText] = useState(DEFAULT_PASTOR);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const scope = useSessionScope(user?.uid, isAdmin);

  useEffect(() => {
    setModalVisible(false);
    setEditField('');
    setEditValue('');
    setEditTitle('');
    setSaving(false);
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'info'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.history) setHistory(data.history);
        if (data.about) setAbout(data.about);
        if (data.mission) setMission(data.mission);
        if (data.pastorText) setPastorText(data.pastorText);
      }
    }, (err) => {
      console.warn("Info listener error:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const openEditModal = (field, currentValue, title) => {
    if (!isAdmin || !user) return;
    scope.invalidate();
    setSaving(false);
    setEditField(field);
    setEditValue(currentValue);
    setEditTitle(title);
    setModalVisible(true);
  };

  const closeEditModal = () => {
    scope.invalidate();
    setSaving(false);
    setModalVisible(false);
  };

  const saveEdit = async () => {
    if (!isAdmin || !user || saving || !['history', 'about', 'mission', 'pastorText'].includes(editField)) return;
    if (!editValue.trim()) {
      Alert.alert("Atenção", "O texto não pode estar vazio.");
      return;
    }
    setSaving(true);
    const token = scope.capture();
    try {
      await setDoc(doc(db, 'config', 'info'), {
        [editField]: editValue.trim()
      }, { merge: true });
      if (!scope.isCurrent(token)) return;
      setModalVisible(false);
      Alert.alert("Sucesso", "Texto atualizado!");
    } catch (err) {
      if (!scope.isCurrent(token)) return;
      console.warn('Info save error:', err.code || err.message);
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      if (scope.isCurrent(token)) setSaving(false);
    }
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    Linking.openURL(url);
  }

  const openContact = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Link indisponível', 'Não foi possível abrir este contato neste dispositivo.');
    }
  };

  const contacts = [
    {
      icon: <Entypo name="phone" size={24} color="#272b30" />,
      value: '+55 (11) 96450-4244',
      url: 'tel:+5511964504244'
    },
    {
      icon: <FontAwesome5 name="whatsapp" size={24} color="#272b30" />,
      value: '+55 (11) 96450-4244',
      url: 'https://wa.me/5511964504244'
    },
    {
      icon: <Entypo name="facebook" size={24} color="#272b30" />,
      value: 'Metodista Santana de Parnaíba',
      url: 'https://www.facebook.com/search/top?q=Metodista%20Santana%20de%20Parna%C3%ADba'
    },
    {
      icon: <Entypo name="youtube" size={24} color="#272b30" />,
      value: 'Metodista Santana de Parnaíba',
      url: 'https://www.youtube.com/results?search_query=Metodista+Santana+de+Parna%C3%ADba'
    },
    {
      icon: <Entypo name="instagram" size={24} color="#272b30" />,
      value: '@metodista.santanadeparnaiba',
      url: 'https://www.instagram.com/metodista.santanadeparnaiba/'
    }
  ]

  const EditButton = ({ onPress }) => (
    isAdmin ? (
      <TouchableOpacity onPress={onPress} style={styles.editButton}>
        <Ionicons name="create-outline" size={18} color="#3b82f6" />
        <Text style={{ color: '#3b82f6', fontSize: 12, marginLeft: 4 }}>Editar</Text>
      </TouchableOpacity>
    ) : null
  );

  // Build menu items inline so isAdmin is always fresh (avoids stale closure)
  const menuItems = [
    {
      key: 1,
      label: 'Nós',
      renderItem: (
        <UsSectionContainer>
          <UsSectionImage source={NosImagem}/>

          <UsSectionSinceText>Desde 1994</UsSectionSinceText>

          <View style={styles.sectionHeaderRow}>
            <UsSectionTitle>Nossa história:</UsSectionTitle>
            <EditButton onPress={() => openEditModal('history', history, 'Nossa História')} />
          </View>

          <UsSectionContentText numberOfLines={historyExpanded ? undefined : 4}>
            {history}
          </UsSectionContentText>

          <ReadMoreButton onPress={() => setHistoryExpanded((value) => !value)} accessibilityRole="button">
            <ReadMoreButtonText>
              {historyExpanded ? 'Ler menos' : 'Ler mais'}
            </ReadMoreButtonText>
            <FontAwesome5 name="angle-right" size={20} color="black" />
          </ReadMoreButton>

          <View style={styles.sectionHeaderRow}>
            <UsSectionTitle>Nosso Pastor:</UsSectionTitle>
            <EditButton onPress={() => openEditModal('pastorText', pastorText, 'Texto do Pastor')} />
          </View>

          <PastorSection>
            <PastorImage source={Pastor} />
            <PastorTextContainer>
              <UsSectionContentText>
                {pastorText}
              </UsSectionContentText>
            </PastorTextContainer>
          </PastorSection>
        </UsSectionContainer>
      )
    },
    {
      key: 2,
      label: 'Contato',
      renderItem: (
        <ContactSectionContainer>
          <ContactSectionTitle>Igreja metodista em Santana de Parnaíba</ContactSectionTitle>

          <MapImage source={Location} />
          <AddressText>
            {endereco}
          </AddressText>

          <GoForButton onPress={openGoogleMaps}>
            <GoForButtonText>
              Como chegar
            </GoForButtonText>
          </GoForButton>

          <ContactsContainer>
            {contacts.map((item, index) => (
              <ContactItem key={index} onPress={() => openContact(item.url)} accessibilityRole="button">
                {item.icon}
                <ContactValueText>
                  {item.value}
                </ContactValueText>
              </ContactItem>
            ))}
          </ContactsContainer>
        </ContactSectionContainer>
      )
    },
    {
      key: 3,
      label: 'Sobre',
      renderItem: (
        <AboutSectionContainer>
          <View style={styles.sectionHeaderRow}>
            <AboutSectionTitle>Sobre nós</AboutSectionTitle>
            <EditButton onPress={() => openEditModal('about', about, 'Sobre Nós')} />
          </View>
          <AboutSectionContentText>
            {about}
          </AboutSectionContentText>

          <AboutSectionImage source={LogoImageSrc}/>

          <View style={styles.sectionHeaderRow}>
            <AboutSectionTitle>Nossa missão</AboutSectionTitle>
            <EditButton onPress={() => openEditModal('mission', mission, 'Nossa Missão')} />
          </View>
          <AboutSectionContentText>
            {mission}
          </AboutSectionContentText>
        </AboutSectionContainer>
      )
    },
  ]
  const [selectedKey, setSelectedKey] = useState(1)

  return (
    <SafeAreaViewComponent>
      <HomeContainer>
        <ScreenHeader>
          <HeaderTitle>
            Metodista de Santana de Parnaíba
          </HeaderTitle>
          <LogoImage source={LogoImageSrc} />
        </ScreenHeader>

        <MenuContainer>
          <MenuSrc>
            {menuItems.map((item) => (
              <MenuItem key={item.key} onPress={() => setSelectedKey(item.key)} isSelected={item.key === selectedKey}>
              <MenuItemLabel isSelected={item.key === selectedKey}>
                {item.label}
                </MenuItemLabel>
              </MenuItem>
            ))}
          </MenuSrc>

          <MenuContent contentContainerStyle={{ paddingBottom: 80 }}>
            {menuItems.find(m => m.key === selectedKey)?.renderItem}
          </MenuContent>
          
        </MenuContainer>
      </HomeContainer>

      <Modal isVisible={modalVisible} onBackdropPress={closeEditModal} onBackButtonPress={closeEditModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar: {editTitle}</Text>
            <TextInput
              style={[styles.input, { height: 150, textAlignVertical: 'top' }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Digite o texto aqui..."
              placeholderTextColor="#9ca3af"
              multiline
            />
            <View style={{ marginTop: 16, gap: 8 }}>
              <Button label={saving ? "Salvando..." : "Salvar"} type="primary" onPress={saveEdit} disabled={saving} />
              <Button label="Cancelar" type="secondary" onPress={closeEditModal} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaViewComponent>
  )
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
  },
  input: {
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  }
})
