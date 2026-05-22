/**
 * VirtualList — high-performance list wrapper around @shopify/flash-list.
 *
 * Use this in place of `FlatList` from 'react-native' for any list that
 * may exceed ~20 items (instructors, bookings, students, schedules).
 *
 * Key differences vs FlatList:
 *   - You MUST provide `estimatedItemSize` (avg row height in px).
 *   - `ItemSeparatorComponent` works; padding inside row is preferred.
 *   - Avoids the long-list scroll jank on web and low-end Android.
 *
 * Drop-in example:
 *   <VirtualList
 *     data={instructors}
 *     estimatedItemSize={96}
 *     renderItem={({ item }) => <InstructorCard instructor={item} />}
 *     keyExtractor={(i) => String(i.id)}
 *   />
 */
import { FlashList, FlashListProps } from '@shopify/flash-list';
import React from 'react';

export type VirtualListProps<T> = FlashListProps<T>;

export default function VirtualList<T>(props: VirtualListProps<T>) {
  return <FlashList {...props} />;
}
