/**
 * Custom Time Picker Wheel Component
 * Provides a scrollable roller-style time picker for web
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();
  const [hours, minutes] = value.split(':').map(Number);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const ITEM_HEIGHT = 50;
  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 / minuteInterval }, (_, i) => i * minuteInterval);

  useEffect(() => {
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

  const renderWheel = (
    items: number[],
    selectedValue: number,
    onSelect: (v: number) => void,
    scrollRef: React.RefObject<ScrollView | null>,
    label: string
  ) => (
    <View style={{ position: 'relative', width: 100 }}>
      {/* Selection indicator */}
      <View
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: 50,
          marginTop: -25,
          backgroundColor: colors.primary + '15',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.primary,
          borderRadius: 8,
          zIndex: 1,
          pointerEvents: 'none' as any,
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={{ height: 250 }}
        contentContainerStyle={{ alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
      >
        <View style={{ height: ITEM_HEIGHT * 2 }} />
        {items.map(item => (
          <Pressable
            key={item}
            style={{ height: 50, justifyContent: 'center', alignItems: 'center', width: 100 }}
            onPress={() => onSelect(item)}
          >
            <Text
              style={{
                fontSize: selectedValue === item ? 28 : 24,
                fontFamily: selectedValue === item ? 'Inter_700Bold' : 'Inter_400Regular',
                color: selectedValue === item ? colors.primary : colors.textTertiary,
              }}
            >
              {item.toString().padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
        <View style={{ height: ITEM_HEIGHT * 2 }} />
      </ScrollView>
      <Text
        style={{
          textAlign: 'center',
          fontSize: 12,
          fontFamily: 'Inter_500Medium',
          color: colors.textSecondary,
          marginTop: 8,
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 250 }}>
        {renderWheel(hoursList, hours, handleHourSelect, hourScrollRef, 'Hour')}
        <Text
          style={{
            fontSize: 32,
            fontFamily: 'Inter_700Bold',
            color: colors.text,
            marginHorizontal: 10,
          }}
        >
          :
        </Text>
        {renderWheel(minutesList, minutes, handleMinuteSelect, minuteScrollRef, 'Min')}
      </View>
    </View>
  );
}
