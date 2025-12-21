/**
 * Hierarchical Location Selector Component
 * Province -> City -> Suburb selection with search
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  onPostalCodeChange?: (postalCode: string) => void; // Optional callback for postal code
  showSuburbs?: boolean; // Whether to show suburb selection
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
  const [showSelector, setShowSelector] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'province' | 'city' | 'suburb'>('province');

  const [provinces] = useState<string[]>(getProvinces());
  const [cities, setCities] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);

  // Update cities when province changes
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

  // Update suburbs when city changes
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

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          {tooltip && (
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowTooltip(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.infoIcon}>
                <Text style={styles.infoIconText}>i</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.selectorButton} onPress={() => setShowSelector(true)}>
        <Text
          style={
            selectedProvince || selectedCity || selectedSuburb
              ? styles.selectedText
              : styles.placeholderText
          }
        >
          {getDisplayText()}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Location Selector Modal */}
      <Modal
        visible={showSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowSelector(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search provinces, cities, or suburbs..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tabs - only show if not searching */}
            {!searchQuery && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'province' && styles.tabActive]}
                  onPress={() => setActiveTab('province')}
                >
                  <Text style={[styles.tabText, activeTab === 'province' && styles.tabTextActive]}>
                    Province
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'city' && styles.tabActive,
                    !selectedProvince && styles.tabDisabled,
                  ]}
                  onPress={() => selectedProvince && setActiveTab('city')}
                  disabled={!selectedProvince}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'city' && styles.tabTextActive,
                      !selectedProvince && styles.tabTextDisabled,
                    ]}
                  >
                    City
                  </Text>
                </TouchableOpacity>
                {showSuburbs && (
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeTab === 'suburb' && styles.tabActive,
                      !selectedCity && styles.tabDisabled,
                    ]}
                    onPress={() => selectedCity && setActiveTab('suburb')}
                    disabled={!selectedCity}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'suburb' && styles.tabTextActive,
                        !selectedCity && styles.tabTextDisabled,
                      ]}
                    >
                      Suburb
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Breadcrumb */}
            {!searchQuery && (selectedProvince || selectedCity) && (
              <View style={styles.breadcrumbContainer}>
                {selectedProvince && (
                  <View style={styles.breadcrumbItem}>
                    <Text style={styles.breadcrumbText}>{selectedProvince}</Text>
                    <TouchableOpacity onPress={() => handleProvinceSelect('')}>
                      <Text style={styles.breadcrumbClear}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {selectedCity && (
                  <View style={styles.breadcrumbItem}>
                    <Text style={styles.breadcrumbArrow}>›</Text>
                    <Text style={styles.breadcrumbText}>{selectedCity}</Text>
                    <TouchableOpacity onPress={() => handleCitySelect('')}>
                      <Text style={styles.breadcrumbClear}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <ScrollView style={styles.scrollView}>
              {/* Smart Search Results */}
              {smartResults && (
                <View style={styles.searchResults}>
                  {smartResults.provinces.length > 0 && (
                    <View style={styles.searchSection}>
                      <Text style={styles.searchSectionTitle}>Provinces</Text>
                      {smartResults.provinces.map(province => (
                        <TouchableOpacity
                          key={province}
                          style={styles.searchResultItem}
                          onPress={() => {
                            handleProvinceSelect(province);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={styles.searchResultText}>{province}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {smartResults.cities.length > 0 && (
                    <View style={styles.searchSection}>
                      <Text style={styles.searchSectionTitle}>Cities</Text>
                      {smartResults.cities.map((city, idx) => (
                        <TouchableOpacity
                          key={`${city.name}-${idx}`}
                          style={styles.searchResultItem}
                          onPress={() => {
                            handleProvinceSelect(city.province);
                            handleCitySelect(city.name);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={styles.searchResultText}>{city.name}</Text>
                          <Text style={styles.searchResultSubtext}>{city.province}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {smartResults.suburbs.length > 0 && showSuburbs && (
                    <View style={styles.searchSection}>
                      <Text style={styles.searchSectionTitle}>Suburbs</Text>
                      {smartResults.suburbs.map((suburb, idx) => (
                        <TouchableOpacity
                          key={`${suburb.name}-${idx}`}
                          style={styles.searchResultItem}
                          onPress={() => {
                            handleProvinceSelect(suburb.province);
                            handleCitySelect(suburb.city);
                            handleSuburbSelect(suburb.name, suburb.postalCode);
                          }}
                        >
                          <Text style={styles.searchResultText}>{suburb.name}</Text>
                          <Text style={styles.searchResultSubtext}>
                            {suburb.city}, {suburb.province}
                            {suburb.postalCode && ` • ${suburb.postalCode}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {smartResults.provinces.length === 0 &&
                    smartResults.cities.length === 0 &&
                    smartResults.suburbs.length === 0 && (
                      <View style={styles.noResults}>
                        <Text style={styles.noResultsText}>No locations found</Text>
                      </View>
                    )}
                </View>
              )}

              {/* Regular Lists */}
              {!searchQuery && (
                <>
                  {activeTab === 'province' && (
                    <View>
                      {getFilteredProvinces().map(province => (
                        <TouchableOpacity
                          key={province}
                          style={[
                            styles.listItem,
                            selectedProvince === province && styles.listItemSelected,
                          ]}
                          onPress={() => handleProvinceSelect(province)}
                        >
                          <Text
                            style={[
                              styles.listItemText,
                              selectedProvince === province && styles.listItemTextSelected,
                            ]}
                          >
                            {province}
                          </Text>
                          {selectedProvince === province && <Text style={styles.checkmark}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {activeTab === 'city' && selectedProvince && (
                    <View>
                      {getFilteredCities().length === 0 ? (
                        <View style={styles.noResults}>
                          <Text style={styles.noResultsText}>No cities found</Text>
                        </View>
                      ) : (
                        getFilteredCities().map(city => (
                          <TouchableOpacity
                            key={city}
                            style={[
                              styles.listItem,
                              selectedCity === city && styles.listItemSelected,
                            ]}
                            onPress={() => handleCitySelect(city)}
                          >
                            <Text
                              style={[
                                styles.listItemText,
                                selectedCity === city && styles.listItemTextSelected,
                              ]}
                            >
                              {city}
                            </Text>
                            {selectedCity === city && <Text style={styles.checkmark}>✓</Text>}
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}

                  {activeTab === 'suburb' && selectedCity && showSuburbs && (
                    <View>
                      {getFilteredSuburbs().length === 0 ? (
                        <View style={styles.noResults}>
                          <Text style={styles.noResultsText}>No suburbs found</Text>
                        </View>
                      ) : (
                        getFilteredSuburbs().map((suburb, idx) => (
                          <TouchableOpacity
                            key={`${suburb.name}-${idx}`}
                            style={[
                              styles.listItem,
                              selectedSuburb === suburb.name && styles.listItemSelected,
                            ]}
                            onPress={() => handleSuburbSelect(suburb.name, suburb.postalCode)}
                          >
                            <View style={styles.suburbInfo}>
                              <Text
                                style={[
                                  styles.listItemText,
                                  selectedSuburb === suburb.name && styles.listItemTextSelected,
                                ]}
                              >
                                {suburb.name}
                              </Text>
                              {suburb.postalCode && (
                                <Text style={styles.postalCode}>{suburb.postalCode}</Text>
                              )}
                            </View>
                            {selectedSuburb === suburb.name && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </TouchableOpacity>
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

      {/* Tooltip Modal */}
      {tooltip && (
        <Modal
          visible={showTooltip}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTooltip(false)}
        >
          <TouchableOpacity
            style={styles.tooltipOverlay}
            activeOpacity={1}
            onPress={() => setShowTooltip(false)}
          >
            <View style={styles.tooltipContainer}>
              <Text style={styles.tooltipTitle}>{label}</Text>
              <Text style={styles.tooltipText}>{tooltip}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowTooltip(false)}>
                <Text style={styles.closeButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  required: {
    color: '#FF3B30',
  },
  infoButton: {
    marginLeft: 8,
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectorButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
    flex: 1,
  },
  selectedText: {
    color: '#333',
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    fontSize: 24,
    color: '#999',
    transform: [{ rotate: '90deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  selectorContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  clearIcon: {
    fontSize: 20,
    color: '#999',
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabDisabled: {
    opacity: 0.4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  tabTextDisabled: {
    color: '#ccc',
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  breadcrumbArrow: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 8,
  },
  breadcrumbClear: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 6,
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemSelected: {
    backgroundColor: '#E7F3FF',
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
  },
  listItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  suburbInfo: {
    flex: 1,
  },
  postalCode: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  searchResults: {
    padding: 8,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  searchResultSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 350,
    width: '100%',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tooltipText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
