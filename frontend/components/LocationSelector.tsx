/**
 * Hierarchical Location Selector Component
 * Province -> City -> Suburb selection with search
 */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  getCitiesInProvince,
  getProvinces,
  getSuburbsInCity,
  searchLocations,
  Suburb,
} from '../utils/cities';

interface LocationSelectorProps {
  label?: string;
  tooltip?: string;
  required?: boolean;
  selectedProvince: string;
  selectedCity: string;
  selectedSuburb: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  onSuburbChange: (suburb: string) => void;
  onPostalCodeChange?: (postalCode: string) => void;
  showSuburbs?: boolean;
}

export default function LocationSelector({
  label = 'Location',
  tooltip,
  required = false,
  selectedProvince,
  selectedCity,
  selectedSuburb,
  onProvinceChange,
  onCityChange,
  onSuburbChange,
  onPostalCodeChange,
  showSuburbs = false,
}: LocationSelectorProps) {
  const { colors } = useTheme();
  const [showSelector, setShowSelector] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'province' | 'city' | 'suburb'>('province');

  const [provinces] = useState<string[]>(getProvinces());
  const [cities, setCities] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);

  useEffect(() => {
    if (selectedProvince) {
      setCities(getCitiesInProvince(selectedProvince));
      if (activeTab === 'province') {
        setActiveTab('city');
      }
    } else {
      setCities([]);
      setSuburbs([]);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedProvince && selectedCity && showSuburbs) {
      setSuburbs(getSuburbsInCity(selectedProvince, selectedCity));
      if (activeTab === 'city') {
        setActiveTab('suburb');
      }
    } else {
      setSuburbs([]);
    }
  }, [selectedProvince, selectedCity, showSuburbs]);

  const handleProvinceSelect = (province: string) => {
    onProvinceChange(province);
    onCityChange('');
    onSuburbChange('');
    setSearchQuery('');
  };

  const handleCitySelect = (city: string) => {
    onCityChange(city);
    onSuburbChange('');
    setSearchQuery('');
    if (!showSuburbs) {
      setShowSelector(false);
    }
  };

  const handleSuburbSelect = (suburbName: string, postalCode?: string) => {
    onSuburbChange(suburbName);
    if (onPostalCodeChange && postalCode) {
      onPostalCodeChange(postalCode);
    }
    setSearchQuery('');
    setShowSelector(false);
  };

  const getFilteredProvinces = () => {
    if (!searchQuery) return provinces;
    return provinces.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const getFilteredCities = () => {
    if (!searchQuery) return cities;
    return cities.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const getFilteredSuburbs = () => {
    if (!searchQuery) return suburbs;
    return suburbs.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const getSmartSearchResults = () => {
    if (!searchQuery) return null;
    return searchLocations(searchQuery);
  };

  const getDisplayText = () => {
    const parts = [];
    if (selectedProvince) parts.push(selectedProvince);
    if (selectedCity) parts.push(selectedCity);
    if (selectedSuburb && showSuburbs) parts.push(selectedSuburb);
    return parts.length > 0 ? parts.join(', ') : 'Select location';
  };

  const smartResults = searchQuery ? getSmartSearchResults() : null;
  const hasSelection = selectedProvince || selectedCity || selectedSuburb;

  return (
    <View style={{ marginBottom: 15 }}>
      {label && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Inter_600SemiBold',
              color: colors.text,
              flex: 1,
            }}
          >
            {label}
            {required && <Text style={{ color: colors.danger }}> *</Text>}
          </Text>
          {tooltip && (
            <Pressable
              style={{
                marginLeft: 8,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setShowTooltip(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="information" size={14} color={colors.textInverse} />
            </Pressable>
          )}
        </View>
      )}

      <Pressable
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.backgroundSecondary : colors.inputBackground,
          padding: 15,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
        })}
        onPress={() => setShowSelector(true)}
      >
        <Text
          style={{
            color: hasSelection ? colors.inputText : colors.inputPlaceholder,
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            flex: 1,
          }}
        >
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </Pressable>

      {/* Location Selector Modal */}
      <Modal
        visible={showSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSelector(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '90%',
              paddingBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
              }}
            >
              <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.text }}>
                Select Location
              </Text>
              <Pressable onPress={() => setShowSelector(false)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>
                  Done
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.backgroundSecondary,
                margin: 16,
                paddingHorizontal: 12,
                borderRadius: 10,
              }}
            >
              <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, padding: 12, fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.inputText }}
                placeholder="Search provinces, cities, or suburbs..."
                placeholderTextColor={colors.inputPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {!searchQuery && (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: 16 }}>
                {(['province', 'city', ...(showSuburbs ? ['suburb'] : [])] as const).map(tab => {
                  const isActive = activeTab === tab;
                  const isDisabled = (tab === 'city' && !selectedProvince) || (tab === 'suburb' && !selectedCity);
                  return (
                    <Pressable
                      key={tab}
                      style={{
                        flex: 1, paddingVertical: 12, alignItems: 'center',
                        borderBottomWidth: 2,
                        borderBottomColor: isActive ? colors.primary : 'transparent',
                        opacity: isDisabled ? 0.4 : 1,
                      }}
                      onPress={() => !isDisabled && setActiveTab(tab)}
                      disabled={isDisabled}
                    >
                      <Text style={{
                        fontSize: 14, fontFamily: 'Inter_600SemiBold',
                        color: isActive ? colors.primary : isDisabled ? colors.textTertiary : colors.textSecondary,
                      }}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {!searchQuery && (selectedProvince || selectedCity) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.backgroundSecondary }}>
                {selectedProvince && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.primary }}>{selectedProvince}</Text>
                    <Pressable onPress={() => handleProvinceSelect('')} style={{ padding: 6 }}>
                      <Ionicons name="close-circle" size={16} color={colors.danger} style={{ marginLeft: 4 }} />
                    </Pressable>
                  </View>
                )}
                {selectedCity && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={{ marginHorizontal: 6 }} />
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.primary }}>{selectedCity}</Text>
                    <Pressable onPress={() => handleCitySelect('')} style={{ padding: 6 }}>
                      <Ionicons name="close-circle" size={16} color={colors.danger} style={{ marginLeft: 4 }} />
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <ScrollView style={{ maxHeight: 500 }}>
              {smartResults && (
                <View style={{ padding: 8 }}>
                  {smartResults.provinces.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textTertiary, textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: colors.backgroundSecondary }}>Provinces</Text>
                      {smartResults.provinces.map(province => (
                        <Pressable key={province} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }} onPress={() => { handleProvinceSelect(province); setSearchQuery(''); }}>
                          <Text style={{ fontSize: 16, fontFamily: 'Inter_500Medium', color: colors.text }}>{province}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {smartResults.cities.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textTertiary, textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: colors.backgroundSecondary }}>Cities</Text>
                      {smartResults.cities.map((city, idx) => (
                        <Pressable key={`${city.name}-${idx}`} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }} onPress={() => { handleProvinceSelect(city.province); handleCitySelect(city.name); setSearchQuery(''); }}>
                          <Text style={{ fontSize: 16, fontFamily: 'Inter_500Medium', color: colors.text }}>{city.name}</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textTertiary, marginTop: 2 }}>{city.province}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {smartResults.suburbs.length > 0 && showSuburbs && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textTertiary, textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: colors.backgroundSecondary }}>Suburbs</Text>
                      {smartResults.suburbs.map((suburb, idx) => (
                        <Pressable key={`${suburb.name}-${idx}`} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }} onPress={() => { handleProvinceSelect(suburb.province); handleCitySelect(suburb.city); handleSuburbSelect(suburb.name, suburb.postalCode); }}>
                          <Text style={{ fontSize: 16, fontFamily: 'Inter_500Medium', color: colors.text }}>{suburb.name}</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textTertiary, marginTop: 2 }}>{suburb.city}, {suburb.province}{suburb.postalCode && ` \u2022 ${suburb.postalCode}`}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {smartResults.provinces.length === 0 && smartResults.cities.length === 0 && smartResults.suburbs.length === 0 && (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.textTertiary }}>No locations found</Text>
                    </View>
                  )}
                </View>
              )}

              {!searchQuery && (
                <>
                  {activeTab === 'province' && (
                    <View>
                      {getFilteredProvinces().map(province => (
                        <Pressable
                          key={province}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: selectedProvince === province ? colors.primary + '12' : 'transparent' }}
                          onPress={() => handleProvinceSelect(province)}
                        >
                          <Text style={{ fontSize: 16, fontFamily: selectedProvince === province ? 'Inter_600SemiBold' : 'Inter_400Regular', color: selectedProvince === province ? colors.primary : colors.text }}>{province}</Text>
                          {selectedProvince === province && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {activeTab === 'city' && selectedProvince && (
                    <View>
                      {getFilteredCities().length === 0 ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.textTertiary }}>No cities found</Text>
                        </View>
                      ) : (
                        getFilteredCities().map(city => (
                          <Pressable
                            key={city}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: selectedCity === city ? colors.primary + '12' : 'transparent' }}
                            onPress={() => handleCitySelect(city)}
                          >
                            <Text style={{ fontSize: 16, fontFamily: selectedCity === city ? 'Inter_600SemiBold' : 'Inter_400Regular', color: selectedCity === city ? colors.primary : colors.text }}>{city}</Text>
                            {selectedCity === city && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                          </Pressable>
                        ))
                      )}
                    </View>
                  )}

                  {activeTab === 'suburb' && selectedCity && showSuburbs && (
                    <View>
                      {getFilteredSuburbs().length === 0 ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.textTertiary }}>No suburbs found</Text>
                        </View>
                      ) : (
                        getFilteredSuburbs().map((suburb, idx) => (
                          <Pressable
                            key={`${suburb.name}-${idx}`}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: selectedSuburb === suburb.name ? colors.primary + '12' : 'transparent' }}
                            onPress={() => handleSuburbSelect(suburb.name, suburb.postalCode)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 16, fontFamily: selectedSuburb === suburb.name ? 'Inter_600SemiBold' : 'Inter_400Regular', color: selectedSuburb === suburb.name ? colors.primary : colors.text }}>{suburb.name}</Text>
                              {suburb.postalCode && <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textTertiary, marginTop: 2 }}>{suburb.postalCode}</Text>}
                            </View>
                            {selectedSuburb === suburb.name && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                          </Pressable>
                        ))
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {tooltip && (
        <Modal visible={showTooltip} transparent animationType="fade" onRequestClose={() => setShowTooltip(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} onPress={() => setShowTooltip(false)}>
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, maxWidth: 350, width: '100%' }}>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.text, marginBottom: 10 }}>{label}</Text>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.textSecondary, lineHeight: 22, marginBottom: 20 }}>{tooltip}</Text>
              <Pressable onPress={() => setShowTooltip(false)} style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryDark : colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' })}>
                <Text style={{ color: colors.buttonPrimaryText, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Got it!</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
