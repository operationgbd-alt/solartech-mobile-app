import React, { useState, useLayoutEffect, useEffect, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, Linking, Platform, TextInput, ScrollView, Image, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MailComposer from "expo-mail-composer";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { InterventionStatus, Photo } from "@/types";
import { api, PhotoMeta } from "@/services/api";

type InterventionsStackParamList = {
  InterventionsList: undefined;
  InterventionDetail: { interventionId: string };
};

type InterventionDetailNavProp = NativeStackNavigationProp<InterventionsStackParamList, "InterventionDetail">;
type InterventionDetailRouteProp = RouteProp<InterventionsStackParamList, "InterventionDetail">;

interface Props {
  navigation: InterventionDetailNavProp;
  route: InterventionDetailRouteProp;
}

const STATUS_CONFIG: Record<InterventionStatus, { label: string; color: string; icon: string }> = {
  assegnato: { label: 'Assegnato', color: '#FF9500', icon: 'inbox' },
  appuntamento_fissato: { label: 'Appuntamento Fissato', color: '#007AFF', icon: 'calendar' },
  in_corso: { label: 'In Corso', color: '#5856D6', icon: 'play-circle' },
  completato: { label: 'Completato', color: '#34C759', icon: 'check-circle' },
  chiuso: { label: 'Chiuso', color: '#8E8E93', icon: 'archive' },
};

const CATEGORY_LABELS: Record<string, string> = {
  sopralluogo: 'Sopralluogo',
  installazione: 'Installazione',
  manutenzione: 'Manutenzione',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  bassa: { label: 'Bassa', color: '#8E8E93' },
  normale: { label: 'Normale', color: '#007AFF' },
  alta: { label: 'Alta', color: '#FF9500' },
  urgente: { label: 'Urgente', color: '#FF3B30' },
};

const STATUS_OPTIONS: { value: InterventionStatus; label: string }[] = [
  { value: 'assegnato', label: 'Assegnato' },
  { value: 'appuntamento_fissato', label: 'Appuntamento Fissato' },
  { value: 'in_corso', label: 'In Corso' },
  { value: 'completato', label: 'Completato' },
];

export default function InterventionDetailScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { getInterventionById, updateIntervention, deleteIntervention, addAppointment, users } = useApp();
  const { user, hasValidToken, isDemoMode } = useAuth();
  
  const intervention = getInterventionById(route.params.interventionId);
  
  const isTecnico = user?.role === 'tecnico';
  const isMaster = user?.role === 'master';
  const isMasterOrDitta = user?.role === 'master' || user?.role === 'ditta';
  const canEdit = isTecnico;
  const canAssignTechnician = isMasterOrDitta;
  const canDelete = isMaster;
  
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [serverPhotos, setServerPhotos] = useState<PhotoMeta[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [notes, setNotes] = useState(intervention?.documentation.notes || '');
  const [appointmentDate, setAppointmentDate] = useState<Date>(
    intervention?.appointment?.date ? new Date(intervention.appointment.date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [appointmentNotes, setAppointmentNotes] = useState(intervention?.appointment?.notes || '');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(intervention?.technicianId || null);

  const loadServerPhotos = useCallback(async () => {
    if (!intervention) return;
    setIsLoadingPhotos(true);
    try {
      const response = await api.getInterventionPhotos(intervention.id);
      if (response.success && response.data) {
        setServerPhotos(response.data);
      }
    } catch (error) {
      console.error('Error loading server photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [intervention?.id]);

  useEffect(() => {
    loadServerPhotos();
  }, [loadServerPhotos]);

  const availableTechnicians = users.filter(u => {
    if (u.role !== 'tecnico') return false;
    if (user?.role === 'master') {
      return u.companyId === intervention?.companyId;
    }
    if (user?.role === 'ditta') {
      return u.companyId === user.companyId;
    }
    return false;
  });

  useLayoutEffect(() => {
    if (intervention) {
      navigation.setOptions({
        title: intervention.number,
      });
    }
  }, [navigation, intervention]);

  if (!intervention) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText>Intervento non trovato</ThemedText>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[intervention.status];
  const priorityConfig = PRIORITY_CONFIG[intervention.priority];

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${intervention.client.phone}`);
  };

  const handleNavigate = () => {
    const address = `${intervention.client.address} ${intervention.client.civicNumber}, ${intervention.client.cap} ${intervention.client.city}`;
    const encodedAddress = encodeURIComponent(address);
    
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://maps.apple.com/?daddr=${encodedAddress}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(appointmentDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setAppointmentDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(appointmentDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setAppointmentDate(newDate);
    }
  };

  const handleSaveAppointment = () => {
    updateIntervention(intervention.id, {
      appointment: {
        date: appointmentDate.getTime(),
        confirmedAt: Date.now(),
        notes: appointmentNotes,
      },
      status: intervention.status === 'assegnato' ? 'appuntamento_fissato' : intervention.status,
    });

    addAppointment({
      id: `apt-${Date.now()}`,
      type: 'intervento',
      interventionId: intervention.id,
      clientName: intervention.client.name,
      address: `${intervention.client.address} ${intervention.client.civicNumber}, ${intervention.client.city}`,
      date: appointmentDate.getTime(),
      notes: appointmentNotes,
      notifyBefore: 60,
    });

    if (intervention.status === 'assegnato') {
      api.notifyAppointmentSet(intervention.id, intervention.number, intervention.client.name, appointmentDate.toISOString())
        .catch(err => console.log('[PUSH] Failed to notify appointment set:', err));
    }

    Alert.alert('Appuntamento Salvato', 'L\'appuntamento e stato fissato con successo.');
  };

  const handleSendLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permesso Negato',
          'Per registrare la posizione, abilita i permessi di localizzazione nelle impostazioni.',
          [{ text: 'OK' }]
        );
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let addressString = '';
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (address) {
          addressString = `${address.street || ''} ${address.streetNumber || ''}, ${address.city || ''}`.trim();
        }
      } catch (e) {}

      updateIntervention(intervention.id, {
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: addressString,
          timestamp: Date.now(),
        },
      });

      Alert.alert('Posizione Inviata', 'La tua posizione GPS e stata registrata con successo.');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile ottenere la posizione. Riprova.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const uploadPhotoToServer = async (uri: string): Promise<boolean> => {
    try {
      let base64Data: string;
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        base64Data = `data:image/jpeg;base64,${base64}`;
      }

      const response = await api.uploadPhoto({
        interventionId: intervention.id,
        data: base64Data,
        mimeType: 'image/jpeg',
        uploadedById: user?.id || 'unknown',
      });

      return response.success;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permesso Negato', 'Abilita i permessi della fotocamera nelle impostazioni.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingPhoto(true);
        const success = await uploadPhotoToServer(result.assets[0].uri);
        setIsUploadingPhoto(false);

        if (success) {
          await loadServerPhotos();
          Alert.alert('Foto Caricata', 'La foto e stata caricata sul server con successo.');
        } else {
          const newPhoto: Photo = {
            id: `photo-${Date.now()}`,
            uri: result.assets[0].uri,
            timestamp: Date.now(),
          };
          updateIntervention(intervention.id, {
            documentation: {
              ...intervention.documentation,
              photos: [...intervention.documentation.photos, newPhoto],
            },
          });
          Alert.alert('Foto Salvata Localmente', 'La foto e stata salvata sul dispositivo.');
        }
      }
    } catch (error) {
      setIsUploadingPhoto(false);
      Alert.alert('Errore', 'Impossibile scattare la foto.');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permesso Negato', 'Abilita i permessi della galleria nelle impostazioni.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setIsUploadingPhoto(true);
        let uploadedCount = 0;
        let localCount = 0;

        for (const asset of result.assets) {
          const success = await uploadPhotoToServer(asset.uri);
          if (success) {
            uploadedCount++;
          } else {
            localCount++;
            const newPhoto: Photo = {
              id: `photo-${Date.now()}-${localCount}`,
              uri: asset.uri,
              timestamp: Date.now(),
            };
            updateIntervention(intervention.id, {
              documentation: {
                ...intervention.documentation,
                photos: [...intervention.documentation.photos, newPhoto],
              },
            });
          }
        }

        setIsUploadingPhoto(false);
        await loadServerPhotos();

        if (uploadedCount > 0) {
          Alert.alert('Foto Caricate', `${uploadedCount} foto caricate sul server.`);
        } else if (localCount > 0) {
          Alert.alert('Foto Salvate Localmente', `${localCount} foto salvate sul dispositivo.`);
        }
      }
    } catch (error) {
      setIsUploadingPhoto(false);
      Alert.alert('Errore', 'Impossibile caricare le immagini.');
    }
  };

  const handleSaveNotes = () => {
    updateIntervention(intervention.id, {
      documentation: {
        ...intervention.documentation,
        notes: notes,
      },
    });
    Alert.alert('Note Salvate', 'Le note sono state salvate con successo.');
  };

  const handleChangeStatus = (newStatus: InterventionStatus) => {
    const totalPhotos = serverPhotos.length + intervention.documentation.photos.length;
    if (newStatus === 'completato' && totalPhotos === 0) {
      Alert.alert(
        'Documentazione Mancante',
        'Aggiungi almeno una foto prima di completare l\'intervento.',
        [{ text: 'OK' }]
      );
      return;
    }

    const updates: any = { status: newStatus };
    
    if (newStatus === 'in_corso' && !intervention.documentation.startedAt) {
      updates.documentation = {
        ...intervention.documentation,
        startedAt: Date.now(),
      };
    }
    
    if (newStatus === 'completato') {
      updates.documentation = {
        ...intervention.documentation,
        completedAt: Date.now(),
      };
    }

    updateIntervention(intervention.id, updates);
    
    api.notifyStatusChange(intervention.id, intervention.number, intervention.status, newStatus, intervention.client.name)
      .catch(err => console.log('[PUSH] Failed to notify status change:', err));

    Alert.alert('Stato Aggiornato', `Intervento ora: ${STATUS_CONFIG[newStatus].label}`);
  };

  const handleDeletePhoto = (photoId: string, isServerPhoto: boolean = false) => {
    Alert.alert(
      'Elimina Foto',
      'Sei sicuro di voler eliminare questa foto?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            if (isServerPhoto) {
              const response = await api.deletePhoto(photoId);
              if (response.success) {
                await loadServerPhotos();
              } else {
                Alert.alert('Errore', 'Impossibile eliminare la foto dal server.');
              }
            } else {
              updateIntervention(intervention.id, {
                documentation: {
                  ...intervention.documentation,
                  photos: intervention.documentation.photos.filter(p => p.id !== photoId),
                },
              });
            }
          },
        },
      ]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleAssignTechnician = (technicianId: string | null) => {
    setSelectedTechnicianId(technicianId);
    
    if (technicianId) {
      const technician = availableTechnicians.find(t => t.id === technicianId);
      updateIntervention(intervention.id, {
        technicianId: technicianId,
        technicianName: technician?.name || null,
      });
      
      const msg = `Intervento assegnato a ${technician?.name}`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Tecnico Assegnato', msg);
      }
    } else {
      updateIntervention(intervention.id, {
        technicianId: null,
        technicianName: null,
      });
      
      const msg = 'Assegnazione tecnico rimossa';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Assegnazione Rimossa', msg);
      }
    }
  };

  const handleDeleteIntervention = async () => {
    if (!hasValidToken) {
      Alert.alert(
        'Modalità Offline',
        'L\'eliminazione degli interventi richiede una connessione al server.\n\nEffettua il logout e accedi nuovamente con connessione internet attiva.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Elimina Intervento',
      `Sei sicuro di voler eliminare definitivamente l'intervento ${intervention.number}?\n\nQuesta azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await api.deleteIntervention(intervention.id);
              if (response.success) {
                deleteIntervention(intervention.id);
                Alert.alert('Successo', 'Intervento eliminato con successo', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Errore', response.error || 'Impossibile eliminare l\'intervento');
              }
            } catch (error) {
              console.error('Error deleting intervention:', error);
              Alert.alert('Errore', 'Si è verificato un errore durante l\'eliminazione');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={[styles.statusBanner, { backgroundColor: statusConfig.color + '15' }]}>
        <Feather name={statusConfig.icon as any} size={20} color={statusConfig.color} />
        <ThemedText type="body" style={{ color: statusConfig.color, marginLeft: Spacing.sm, fontWeight: '600' }}>
          {statusConfig.label}
        </ThemedText>
        <View style={{ flex: 1 }} />
        <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
          <ThemedText type="caption" style={{ color: priorityConfig.color, fontWeight: '600' }}>
            {priorityConfig.label}
          </ThemedText>
        </View>
      </View>

      {/* 1. DETTAGLIO INTERVENTO */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="file-text" size={18} color={theme.primary} />
          <ThemedText type="h3" style={{ marginLeft: Spacing.sm }}>
            Dettaglio Intervento
          </ThemedText>
        </View>
        
        <View style={styles.detailRow}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Categoria</ThemedText>
          <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '15' }]}>
            <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
              {CATEGORY_LABELS[intervention.category]}
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Descrizione</ThemedText>
          <ThemedText type="body">{intervention.description}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Assegnato il</ThemedText>
          <ThemedText type="body">{formatDate(intervention.assignedAt)}</ThemedText>
        </View>

        {intervention.technicianName ? (
          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Tecnico Assegnato</ThemedText>
            <View style={[styles.categoryBadge, { backgroundColor: theme.success + '15' }]}>
              <Feather name="user" size={14} color={theme.success} style={{ marginRight: Spacing.xs }} />
              <ThemedText type="body" style={{ color: theme.success, fontWeight: '600' }}>
                {intervention.technicianName}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </Card>

      {/* ASSEGNAZIONE TECNICO - Solo per MASTER e DITTA */}
      {canAssignTechnician && intervention.companyId ? (
        <Card style={styles.section} onPress={() => toggleSection('assegnazione')}>
          <View style={styles.sectionHeader}>
            <Feather name="user-plus" size={18} color={theme.primary} />
            <ThemedText type="h3" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              Assegna Tecnico
            </ThemedText>
            <Feather 
              name={expandedSection === 'assegnazione' ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={theme.textSecondary} 
            />
          </View>

          {intervention.technicianName ? (
            <View style={styles.currentTechnician}>
              <Feather name="user-check" size={16} color={theme.success} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.success, fontWeight: '600' }}>
                Assegnato a: {intervention.technicianName}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.currentTechnician}>
              <Feather name="alert-circle" size={16} color={theme.secondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.secondary }}>
                Nessun tecnico assegnato
              </ThemedText>
            </View>
          )}

          {expandedSection === 'assegnazione' ? (
            <View style={styles.technicianList}>
              {availableTechnicians.length === 0 ? (
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', padding: Spacing.md }}>
                  Nessun tecnico disponibile per questa ditta
                </ThemedText>
              ) : (
                <>
                  {availableTechnicians.map(tech => (
                    <Pressable
                      key={tech.id}
                      style={[
                        styles.technicianItem,
                        { backgroundColor: theme.backgroundSecondary },
                        selectedTechnicianId === tech.id && { 
                          backgroundColor: theme.primary + '20',
                          borderColor: theme.primary,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => handleAssignTechnician(tech.id)}
                    >
                      <View style={[
                        styles.technicianAvatar,
                        { backgroundColor: selectedTechnicianId === tech.id ? theme.primary : theme.textTertiary },
                      ]}>
                        <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>
                          {tech.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.md }}>
                        <ThemedText type="body" style={{ fontWeight: '600' }}>
                          {tech.name}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {tech.email}
                        </ThemedText>
                      </View>
                      {selectedTechnicianId === tech.id ? (
                        <Feather name="check-circle" size={24} color={theme.primary} />
                      ) : (
                        <Feather name="circle" size={24} color={theme.textTertiary} />
                      )}
                    </Pressable>
                  ))}

                  {selectedTechnicianId ? (
                    <Pressable
                      style={[styles.removeAssignmentButton, { backgroundColor: theme.danger + '15' }]}
                      onPress={() => handleAssignTechnician(null)}
                    >
                      <Feather name="user-x" size={18} color={theme.danger} />
                      <ThemedText type="body" style={{ color: theme.danger, marginLeft: Spacing.sm, fontWeight: '600' }}>
                        Rimuovi Assegnazione
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* 2. CLIENTE */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="user" size={18} color={theme.primary} />
          <ThemedText type="h3" style={{ marginLeft: Spacing.sm }}>
            Cliente
          </ThemedText>
        </View>

        <ThemedText type="body" style={{ fontWeight: '600', fontSize: 18 }}>
          {intervention.client.name}
        </ThemedText>
        
        <View style={styles.addressContainer}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <View style={{ marginLeft: Spacing.xs, flex: 1 }}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {intervention.client.address} {intervention.client.civicNumber}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {intervention.client.cap} {intervention.client.city}
            </ThemedText>
          </View>
        </View>

        <View style={styles.contactButtons}>
          <Pressable 
            style={[styles.contactButton, { backgroundColor: theme.primary }]}
            onPress={handleCall}
          >
            <Feather name="phone" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', marginLeft: Spacing.sm, fontWeight: '600' }}>
              Chiama
            </ThemedText>
          </Pressable>

          <Pressable 
            style={[styles.contactButton, { backgroundColor: theme.success }]}
            onPress={handleNavigate}
          >
            <Feather name="navigation" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: '#FFFFFF', marginLeft: Spacing.sm, fontWeight: '600' }}>
              Naviga
            </ThemedText>
          </Pressable>
        </View>
      </Card>

      {/* 3. CALENDARIO */}
      <Card style={styles.section} onPress={() => toggleSection('calendario')}>
        <View style={styles.sectionHeader}>
          <Feather name="calendar" size={18} color={theme.primary} />
          <ThemedText type="h3" style={{ marginLeft: Spacing.sm, flex: 1 }}>
            Calendario
          </ThemedText>
          <Feather 
            name={expandedSection === 'calendario' ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={theme.textSecondary} 
          />
        </View>

        {intervention.appointment ? (
          <View style={styles.appointmentInfo}>
            <Feather name="check-circle" size={16} color={theme.success} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm, fontWeight: '600' }}>
              {formatDateTime(intervention.appointment.date)}
            </ThemedText>
          </View>
        ) : null}

        {expandedSection === 'calendario' ? (
          <View style={styles.calendarContent}>
            <View style={styles.dateTimeRow}>
              <Pressable 
                style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={16} color={theme.primary} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  {appointmentDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                </ThemedText>
              </Pressable>

              <Pressable 
                style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={16} color={theme.primary} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  {appointmentDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
              </Pressable>
            </View>

            {showDatePicker ? (
              <DateTimePicker
                value={appointmentDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            ) : null}

            {showTimePicker ? (
              <DateTimePicker
                value={appointmentDate}
                mode="time"
                display="default"
                onChange={handleTimeChange}
                is24Hour={true}
              />
            ) : null}

            <TextInput
              style={[styles.notesInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="Note appuntamento..."
              placeholderTextColor={theme.textTertiary}
              value={appointmentNotes}
              onChangeText={setAppointmentNotes}
              multiline
            />

            <Button onPress={handleSaveAppointment} style={{ marginTop: Spacing.md }}>
              Salva Appuntamento
            </Button>
          </View>
        ) : null}
      </Card>

      {/* 4. DOCUMENTAZIONE - Visibile per tutti */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="folder" size={18} color={theme.primary} />
          <ThemedText type="h3" style={{ marginLeft: Spacing.sm, flex: 1 }}>
            Documentazione
          </ThemedText>
        </View>

        {/* Foto */}
        <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.sm }}>
          Foto ({serverPhotos.length + intervention.documentation.photos.length})
        </ThemedText>
        
        {canEdit ? (
          <View style={styles.photoButtons}>
            <Pressable 
              style={[styles.photoButton, { backgroundColor: theme.primary }]}
              onPress={handleTakePhoto}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Feather name="camera" size={20} color="#FFFFFF" />
              )}
              <ThemedText type="small" style={{ color: '#FFFFFF', marginTop: Spacing.xs }}>
                {isUploadingPhoto ? 'Caricando...' : 'Scatta Foto'}
              </ThemedText>
            </Pressable>

            <Pressable 
              style={[styles.photoButton, { backgroundColor: theme.secondary }]}
              onPress={handlePickImage}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Feather name="image" size={20} color="#FFFFFF" />
              )}
              <ThemedText type="small" style={{ color: '#FFFFFF', marginTop: Spacing.xs }}>
                {isUploadingPhoto ? 'Caricando...' : 'Galleria'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {isLoadingPhotos ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.textTertiary, marginTop: Spacing.xs }}>
              Caricamento foto...
            </ThemedText>
          </View>
        ) : serverPhotos.length > 0 || intervention.documentation.photos.length > 0 ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {/* Foto dal server */}
              {serverPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoThumbnail}>
                  <Pressable 
                    onLongPress={canEdit ? () => handleDeletePhoto(photo.id, true) : undefined}
                  >
                    <Image 
                      source={{ uri: api.getPhotoImageUrl(photo.id) }} 
                      style={styles.photoImage}
                      onError={() => console.log('[SERVER PHOTO ERROR] Failed to load:', photo.id)}
                    />
                    <View style={[styles.serverPhotoIndicator, { backgroundColor: theme.success }]}>
                      <Feather name="cloud" size={10} color="#FFFFFF" />
                    </View>
                  </Pressable>
                  <ThemedText type="caption" style={styles.photoTimestamp}>
                    {new Date(photo.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </ThemedText>
                </View>
              ))}
              {/* Foto locali */}
              {intervention.documentation.photos.map((photo) => (
                <View key={photo.id} style={styles.photoThumbnail}>
                  <Pressable 
                    onLongPress={canEdit ? () => handleDeletePhoto(photo.id, false) : undefined}
                  >
                    <Image 
                      source={{ uri: photo.uri }} 
                      style={styles.photoImage}
                      onError={() => console.log('[LOCAL PHOTO ERROR] Failed to load:', photo.uri?.substring(0, 50))}
                    />
                    <View style={[styles.serverPhotoIndicator, { backgroundColor: theme.textTertiary }]}>
                      <Feather name="smartphone" size={10} color="#FFFFFF" />
                    </View>
                  </Pressable>
                  <ThemedText type="caption" style={styles.photoTimestamp}>
                    {new Date(photo.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
            <ThemedText type="caption" style={{ color: theme.textTertiary, marginTop: Spacing.xs }}>
              {serverPhotos.length > 0 ? 'Le foto con icona cloud sono visibili su tutti i dispositivi.' : 'Le foto locali sono visibili solo su questo dispositivo.'}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="image" size={24} color={theme.textTertiary} />
            <ThemedText type="caption" style={{ color: theme.textTertiary, marginTop: Spacing.xs }}>
              Nessuna foto caricata
            </ThemedText>
          </View>
        )}

        {/* Posizione GPS */}
        <ThemedText type="body" style={{ fontWeight: '600', marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          Posizione GPS
        </ThemedText>

        {intervention.location ? (
          <View style={[styles.locationInfo, { backgroundColor: theme.success + '15' }]}>
            <Feather name="check-circle" size={16} color={theme.success} />
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <ThemedText type="small" style={{ color: theme.success, fontWeight: '600' }}>
                Posizione registrata
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {intervention.location.address || `${intervention.location.latitude.toFixed(4)}, ${intervention.location.longitude.toFixed(4)}`}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="map-pin" size={24} color={theme.textTertiary} />
            <ThemedText type="caption" style={{ color: theme.textTertiary, marginTop: Spacing.xs }}>
              Posizione non ancora registrata
            </ThemedText>
          </View>
        )}

        {canEdit ? (
          <Button 
            onPress={handleSendLocation} 
            disabled={isLoadingLocation}
            style={{ backgroundColor: theme.success, marginTop: Spacing.sm }}
          >
            {isLoadingLocation ? 'Acquisizione GPS...' : 'Invia Posizione'}
          </Button>
        ) : null}

        {/* Note */}
        <ThemedText type="body" style={{ fontWeight: '600', marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          Note Intervento
        </ThemedText>

        {canEdit ? (
          <>
            <TextInput
              style={[styles.notesInputLarge, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="Inserisci note sull'intervento..."
              placeholderTextColor={theme.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
            <Button onPress={handleSaveNotes} style={{ marginTop: Spacing.sm }}>
              Salva Note
            </Button>
          </>
        ) : (
          <View style={[styles.notesDisplay, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="body" style={{ color: notes ? theme.text : theme.textTertiary }}>
              {notes || 'Nessuna nota inserita'}
            </ThemedText>
          </View>
        )}

      </Card>

      {/* 5. ESITA INTERVENTO - Solo per Tecnici */}
      {canEdit ? (
        <Card style={styles.section} onPress={() => toggleSection('esita')}>
          <View style={styles.sectionHeader}>
            <Feather name="check-square" size={18} color={theme.primary} />
            <ThemedText type="h3" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              Esita Intervento
            </ThemedText>
            <Feather 
              name={expandedSection === 'esita' ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={theme.textSecondary} 
            />
          </View>

          {expandedSection === 'esita' ? (
            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map((option) => {
                const config = STATUS_CONFIG[option.value];
                const isSelected = intervention.status === option.value;
                
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.statusOption,
                      { 
                        backgroundColor: isSelected ? config.color + '20' : theme.backgroundSecondary,
                        borderColor: isSelected ? config.color : 'transparent',
                      }
                    ]}
                    onPress={() => handleChangeStatus(option.value)}
                  >
                    <Feather 
                      name={config.icon as any} 
                      size={20} 
                      color={isSelected ? config.color : theme.textSecondary} 
                    />
                    <ThemedText 
                      type="body" 
                      style={{ 
                        marginLeft: Spacing.sm, 
                        color: isSelected ? config.color : theme.text,
                        fontWeight: isSelected ? '600' : '400',
                      }}
                    >
                      {option.label}
                    </ThemedText>
                    {isSelected ? (
                      <Feather 
                        name="check" 
                        size={18} 
                        color={config.color} 
                        style={{ marginLeft: 'auto' }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* 6. ELIMINA INTERVENTO - Solo per MASTER */}
      {canDelete ? (
        <Card style={[styles.section, { borderColor: theme.danger + '30', borderWidth: 1 }]}>
          <View style={styles.sectionHeader}>
            <Feather name="trash-2" size={18} color={theme.danger} />
            <ThemedText type="h3" style={{ marginLeft: Spacing.sm, color: theme.danger }}>
              Zona Pericolosa
            </ThemedText>
          </View>

          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            Eliminando questo intervento verranno rimosse anche tutte le foto e i dati associati. Questa azione non può essere annullata.
          </ThemedText>

          <Pressable
            style={[styles.deleteButton, { backgroundColor: theme.danger }]}
            onPress={handleDeleteIntervention}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="trash-2" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: '#FFFFFF', marginLeft: Spacing.sm, fontWeight: '600' }}>
                  Elimina Intervento
                </ThemedText>
              </>
            )}
          </Pressable>
        </Card>
      ) : null}

      <View style={{ height: Spacing['3xl'] }} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  detailRow: {
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
  },
  contactButtons: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarContent: {
    marginTop: Spacing.sm,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  notesInput: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  quickStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageContent: {
    marginTop: Spacing.md,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  photosScroll: {
    marginTop: Spacing.md,
  },
  photoThumbnail: {
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#333',
  },
  photoTimestamp: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontSize: 10,
  },
  serverPhotoIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  notesInputLarge: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusOptions: {
    gap: Spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  notesDisplay: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    minHeight: 60,
  },
  currentTechnician: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  technicianList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  technicianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  technicianAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAssignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
