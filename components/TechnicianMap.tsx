import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.45;

interface TechnicianLocation {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: number;
  isOnline: boolean;
}

interface TechnicianData {
  id: string;
  name: string;
  phone?: string | null;
  companyName?: string | null;
  lastLocation?: TechnicianLocation;
}

interface TechnicianMapProps {
  technicians: TechnicianData[];
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress: (tech: TechnicianData) => void;
  onCallTech: (phone?: string | null) => void;
  mapRef: React.RefObject<MapView | null>;
  onlineTechnicians: TechnicianData[];
  offlineTechnicians: TechnicianData[];
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Adesso';
  if (minutes < 60) return `${minutes} min fa`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ore fa`;
  
  const days = Math.floor(hours / 24);
  return `${days} giorni fa`;
}

export function TechnicianMap({
  technicians,
  initialRegion,
  onMarkerPress,
  onCallTech,
  mapRef,
  onlineTechnicians,
  offlineTechnicians,
}: TechnicianMapProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={false}
      >
        {technicians.map((tech) => {
          const isOnline = tech.lastLocation?.isOnline;
          return (
            <Marker
              key={tech.id}
              coordinate={{
                latitude: tech.lastLocation!.latitude,
                longitude: tech.lastLocation!.longitude,
              }}
              onPress={() => onMarkerPress(tech)}
              pinColor={isOnline ? '#34C759' : '#8E8E93'}
            >
              <View style={[
                styles.customMarker,
                { backgroundColor: isOnline ? '#34C759' : '#8E8E93' }
              ]}>
                <ThemedText style={styles.markerText}>
                  {tech.name.split(' ').map(n => n[0]).join('')}
                </ThemedText>
              </View>
              <Callout tooltip onPress={() => onCallTech(tech.phone)}>
                <View style={[styles.callout, { backgroundColor: theme.backgroundDefault }]}>
                  <ThemedText type="h4" style={{ marginBottom: 4 }}>{tech.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {tech.companyName}
                  </ThemedText>
                  <View style={[styles.calloutStatus, { backgroundColor: isOnline ? '#34C75920' : '#8E8E9320' }]}>
                    <View style={[styles.calloutDot, { backgroundColor: isOnline ? '#34C759' : '#8E8E93' }]} />
                    <ThemedText type="caption" style={{ color: isOnline ? '#34C759' : '#8E8E93' }}>
                      {isOnline ? 'Online' : 'Offline'}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                    {tech.lastLocation ? formatTimeAgo(tech.lastLocation.timestamp) : ''}
                  </ThemedText>
                  {tech.phone ? (
                    <View style={[styles.calloutAction, { backgroundColor: theme.primary }]}>
                      <Feather name="phone" size={12} color="#FFF" />
                      <ThemedText type="caption" style={{ color: '#FFF', marginLeft: 4 }}>
                        Chiama
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
      
      <View style={[styles.mapLegend, { backgroundColor: theme.backgroundDefault + 'E6' }]}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <ThemedText type="caption">Online ({onlineTechnicians.length})</ThemedText>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#8E8E93' }]} />
          <ThemedText type="caption">Offline ({offlineTechnicians.length})</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  mapLegend: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  callout: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  calloutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  calloutAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
});
