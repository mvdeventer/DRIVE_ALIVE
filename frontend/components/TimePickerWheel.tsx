/**
 * Custom Time Picker Wheel Component
 * Provides a scrollable roller-style time picker for web
 */
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TimePickerWheelProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  minuteInterval?: number;
}

export default function TimePickerWheel({
  value,
  onChange,
  minuteInterval = 15,
}: TimePickerWheelProps) {
  const [hours, minutes] = value.split(':').map(Number);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const ITEM_HEIGHT = 50;
  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 / minuteInterval }, (_, i) => i * minuteInterval);

  useEffect(() => {
    // Scroll to current values
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: hours * ITEM_HEIGHT, animated: false });
      const minuteIndex = minutesList.indexOf(minutes);
      minuteScrollRef.current?.scrollTo({ y: minuteIndex * ITEM_HEIGHT, animated: false });
    }, 100);
  }, []);

  const handleHourSelect = (hour: number) => {
    const newTime = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(newTime);
    hourScrollRef.current?.scrollTo({ y: hour * ITEM_HEIGHT, animated: true });
  };

  const handleMinuteSelect = (minute: number) => {
    const newTime = `${hours.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(newTime);
    const minuteIndex = minutesList.indexOf(minute);
    minuteScrollRef.current?.scrollTo({ y: minuteIndex * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.wheelContainer}>
        {/* Hours Wheel */}
        <View style={styles.wheel}>
          <View style={styles.selectionIndicator} />
          <ScrollView
            ref={hourScrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
          >
            <View style={{ height: ITEM_HEIGHT * 2 }} />
            {hoursList.map(hour => (
              <TouchableOpacity
                key={hour}
                style={[styles.item, hours === hour && styles.selectedItem]}
                onPress={() => handleHourSelect(hour)}
              >
                <Text style={[styles.itemText, hours === hour && styles.selectedItemText]}>
                  {hour.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={{ height: ITEM_HEIGHT * 2 }} />
          </ScrollView>
          <Text style={styles.wheelLabel}>Hour</Text>
        </View>

        {/* Separator */}
        <Text style={styles.separator}>:</Text>

        {/* Minutes Wheel */}
        <View style={styles.wheel}>
          <View style={styles.selectionIndicator} />
          <ScrollView
            ref={minuteScrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
          >
            <View style={{ height: ITEM_HEIGHT * 2 }} />
            {minutesList.map(minute => (
              <TouchableOpacity
                key={minute}
                style={[styles.item, minutes === minute && styles.selectedItem]}
                onPress={() => handleMinuteSelect(minute)}
              >
                <Text style={[styles.itemText, minutes === minute && styles.selectedItemText]}>
                  {minute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={{ height: ITEM_HEIGHT * 2 }} />
          </ScrollView>
          <Text style={styles.wheelLabel}>Min</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 250,
  },
  wheel: {
    position: 'relative',
    width: 100,
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 50,
    marginTop: -25,
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#007bff',
    zIndex: 1,
    pointerEvents: 'none',
  },
  scrollView: {
    height: 250,
  },
  scrollContent: {
    alignItems: 'center',
  },
  item: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  selectedItem: {
    // backgroundColor: 'rgba(0, 123, 255, 0.1)',
  },
  itemText: {
    fontSize: 24,
    color: '#999',
  },
  selectedItemText: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 28,
  },
  separator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10,
  },
  wheelLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});
