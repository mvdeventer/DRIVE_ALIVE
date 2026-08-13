/**
 * Database Interface Screen
 * Admin CRUD operations for database records
 * Platform: Windows PC Web Browsers ONLY
 * Features: Tab navigation, table view, search/filter, pagination, edit modal
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useT } from '../../i18n';
import ThemedModal from '../../components/ui/Modal';
import { Button } from '../../components/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigation } from '@react-navigation/native';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import DatabaseEditForm from '../../components/DatabaseEditForm';
import DatabaseDeleteConfirm from '../../components/DatabaseDeleteConfirm';
import useWindowsDetection from '../../hooks/useWindowsDetection';
import {
  getDatabaseUsers,
  getDatabaseInstructors,
  getDatabaseStudents,
  getDatabaseBookings,
  getDatabaseReviews,
  getDatabaseSchedules,
  getUserDetail,
  getInstructorDetail,
  getStudentDetail,
  getBookingDetail,
  handleApiError,
  bulkUpdateRecords,
} from '../../services/database-interface';
import apiService from '../../services/api';

type TabType = 'users' | 'admins' | 'instructors' | 'students' | 'bookings' | 'reviews' | 'schedules';
type DeletableTab = 'users' | 'instructors' | 'students' | 'bookings';

// Column keys mirror the field names each /admin/database-interface endpoint
// actually returns, so the picker and the exports stay in step with the API.
const COLUMN_DEFINITIONS: Record<TabType, Array<{ key: string; label: string }>> = {
  users: [
    { key: 'id', label: 'ID' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'id_number', label: 'ID Number' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'address', label: 'Address' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
  ],
  admins: [
    { key: 'id', label: 'ID' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'id_number', label: 'ID Number' },
    { key: 'status', label: 'Status' },
    { key: 'address', label: 'Address' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
  ],
  instructors: [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'instructor_name', label: 'Name' },
    { key: 'license_number', label: 'License #' },
    { key: 'vehicle_make', label: 'Vehicle Make' },
    { key: 'vehicle_model', label: 'Vehicle Model' },
    { key: 'vehicle_year', label: 'Vehicle Year' },
    { key: 'is_verified', label: 'Verified' },
    { key: 'hourly_rate', label: 'Hourly Rate' },
    { key: 'average_rating', label: 'Rating' },
    { key: 'created_at', label: 'Created At' },
  ],
  students: [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'student_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'suburb', label: 'Suburb' },
    { key: 'created_at', label: 'Created At' },
  ],
  bookings: [
    { key: 'id', label: 'ID' },
    { key: 'booking_reference', label: 'Reference' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'instructor_id', label: 'Instructor ID' },
    { key: 'lesson_date', label: 'Lesson Date' },
    { key: 'duration_minutes', label: 'Duration' },
    { key: 'status', label: 'Status' },
    { key: 'payment_status', label: 'Payment Status' },
    { key: 'amount', label: 'Amount' },
    { key: 'pickup_address', label: 'Pickup Address' },
    { key: 'created_at', label: 'Created At' },
  ],
  reviews: [
    { key: 'id', label: 'ID' },
    { key: 'booking_id', label: 'Booking ID' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'instructor_id', label: 'Instructor ID' },
    { key: 'rating', label: 'Rating' },
    { key: 'comment', label: 'Comment' },
    { key: 'created_at', label: 'Created At' },
  ],
  schedules: [
    { key: 'id', label: 'ID' },
    { key: 'instructor_id', label: 'Instructor ID' },
    { key: 'instructor_name', label: 'Instructor' },
    { key: 'day_of_week', label: 'Day of Week' },
    { key: 'start_time', label: 'Start Time' },
    { key: 'end_time', label: 'End Time' },
    { key: 'is_available', label: 'Available' },
  ],
};

// Every column visible by default, derived from the definitions above so the
// two can never drift apart.
const ALL_COLUMN_KEYS = Object.fromEntries(
  Object.entries(COLUMN_DEFINITIONS).map(([tab, cols]) => [tab, cols.map((col) => col.key)])
) as Record<TabType, string[]>;

// Bumped when the column keys changed; preferences saved against the old key
// names describe columns that no longer exist.
const COLUMN_PREFS_KEY = 'dbInterfaceColumns.v2';

// Reviews and schedules are list-only on the backend: no search, no detail,
// no update, no delete. Their tables render read-only.
const READ_ONLY_TABS: TabType[] = ['reviews', 'schedules'];

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : '-';

// Backend serialises time columns as HH:MM:SS
const formatTime = (value?: string | null) => (value ? String(value).slice(0, 5) : '-');

const formatDay = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '-';

interface TableState {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: string;
  sort: string;
}

const DatabaseInterfaceScreen = ({ navigation }: any) => {
  const { colors, withAlpha } = useTheme();
  const t = useT();
  const scrollViewRef = useRef<ScrollView>(null);
  const platformDetection = useWindowsDetection();
  const isDeletableTab = (tab: TabType): tab is DeletableTab => tab !== 'reviews' && tab !== 'schedules';
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  // Latest fetchers, for the debounced search callback — see handleSearchChange.
  type SearchFetcher = (page?: number, searchOverride?: string) => void;
  const searchFetchersRef = useRef<Record<string, SearchFetcher>>({});

  const getColumnDefinitions = (tab: TabType) => COLUMN_DEFINITIONS[tab];

  // Tab & UI state
  const [activeTab, setActiveTab] = useState<TabType>('users');
  // Admins are User rows filtered to role=admin, so they share the users API surface.
  const apiTab: Exclude<TabType, 'admins'> = activeTab === 'admins' ? 'users' : activeTab;
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedRecordETag, setSelectedRecordETag] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteRecord, setSelectedDeleteRecord] = useState<any>(null);
  const [selectedDeleteETag, setSelectedDeleteETag] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Table state (users)
  const [usersTable, setUsersTable] = useState<TableState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    search: '',
    sort: '-created_at',
  });

  // Table state (instructors)
  const [instructorsTable, setInstructorsTable] = useState<TableState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    search: '',
    sort: '-created_at',
  });

  const [studentsTable, setStudentsTable] = useState<TableState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    search: '',
    sort: '-created_at',
  });

  const [bookingsTable, setBookingsTable] = useState<TableState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    search: '',
    sort: '-created_at',
  });

  const [adminsTable, setAdminsTable] = useState<TableState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    search: '',
    sort: '-created_at',
  });

  const [reviewsTable, setReviewsTable] = useState<TableState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    search: '',
    sort: '-created_at',
  });

  const [schedulesTable, setSchedulesTable] = useState<TableState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    search: '',
    sort: 'day_of_week',
  });

  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL');
  const [instructorVerifiedFilter, setInstructorVerifiedFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'>('ALL');
  const [bookingStartDate, setBookingStartDate] = useState<string>('');
  const [bookingEndDate, setBookingEndDate] = useState<string>('');

  // Phase 4.1: Column visibility (persisted to localStorage)
  const [visibleColumns, setVisibleColumns] = useState<Record<TabType, string[]>>(ALL_COLUMN_KEYS);

  // Phase 4.2: Bulk selection state
  const [selectedRows, setSelectedRows] = useState<{ [key: string]: boolean }>({});
  const [bulkActionMenuVisible, setBulkActionMenuVisible] = useState(false);

  // Phase 4.1: Column visibility dropdown
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Phase 4.4: Search history (last 10 searches)
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Database Management Modal
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbAction, setDbAction] = useState<'backup' | 'reset' | 'restore' | null>(null);

  // Debounced search handler (300ms delay)
  const handleSearchChange = useCallback((text: string, table: TabType) => {
    // Clear previous timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // Update search state immediately for input responsiveness
    if (table === 'users') {
      setUsersTable((prev) => ({ ...prev, search: text }));
    } else if (table === 'admins') {
      setAdminsTable((prev) => ({ ...prev, search: text }));
    } else if (table === 'instructors') {
      setInstructorsTable((prev) => ({ ...prev, search: text }));
    } else if (table === 'students') {
      setStudentsTable((prev) => ({ ...prev, search: text }));
    } else if (table === 'bookings') {
      setBookingsTable((prev) => ({ ...prev, search: text }));
    }

    // Debounce the actual API call.
    //
    // Two traps here, both of which silently broke search until a test caught
    // them. This callback is `useCallback([])`, so it is pinned to the first
    // render and the fetchers it closes over read the *initial* table state —
    // hence the ref, refreshed every render. And even the current fetcher would
    // read `search` from state that React has not committed yet, so the text is
    // passed explicitly rather than re-read.
    searchDebounceTimer.current = setTimeout(() => {
      const fetchers = searchFetchersRef.current;
      switch (table) {
        case 'users':
          fetchers.users(1, text);
          break;
        case 'admins':
          fetchers.admins(1, text);
          break;
        case 'instructors':
          fetchers.instructors(1, text);
          break;
        case 'students':
          fetchers.students(1, text);
          break;
        case 'bookings':
          fetchers.bookings(1, text);
          break;
      }
    }, 300);
  }, []);

  // Similar for students, bookings, reviews, schedules...

  // Fetch users
  const fetchUsers = async (page = 1, searchOverride?: string) => {
    setUsersTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseUsers(
        page,
        usersTable.pageSize,
        searchOverride ?? usersTable.search,
        userRoleFilter === 'ALL' ? undefined : userRoleFilter,
        userStatusFilter === 'ALL' ? undefined : userStatusFilter,
        usersTable.sort
      );
      setUsersTable((prev) => ({
        ...prev,
        data: response.data,
        total: response.meta.total,
        page: response.meta.page,
        totalPages: response.meta.total_pages,
        loading: false,
      }));
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setUsersTable((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  const fetchReviews = async (page = 1) => {
    setReviewsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseReviews(page, reviewsTable.pageSize, reviewsTable.sort);
      setReviewsTable((prev) => ({
        ...prev,
        data: response.data,
        total: response.meta.total,
        page: response.meta.page,
        totalPages: response.meta.total_pages,
        loading: false,
      }));
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setReviewsTable((prev) => ({ ...prev, error: errorMsg, loading: false }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  const fetchSchedules = async (page = 1) => {
    setSchedulesTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseSchedules(
        page,
        schedulesTable.pageSize,
        undefined,
        schedulesTable.sort
      );
      setSchedulesTable((prev) => ({
        ...prev,
        data: response.data,
        total: response.meta.total,
        page: response.meta.page,
        totalPages: response.meta.total_pages,
        loading: false,
      }));
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setSchedulesTable((prev) => ({ ...prev, error: errorMsg, loading: false }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  // Fetch admins (users API pinned to role=admin)
  const fetchAdmins = async (page = 1, searchOverride?: string) => {
    setAdminsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseUsers(
        page,
        adminsTable.pageSize,
        searchOverride ?? adminsTable.search,
        'ADMIN',
        undefined,
        adminsTable.sort
      );
      setAdminsTable((prev) => ({
        ...prev,
        data: response.data,
        total: response.meta.total,
        page: response.meta.page,
        totalPages: response.meta.total_pages,
        loading: false,
      }));
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setAdminsTable((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  // Fetch instructors
  const fetchInstructors = async (page = 1, searchOverride?: string) => {
    setInstructorsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const verifiedFilter = instructorVerifiedFilter === 'ALL'
        ? undefined
        : instructorVerifiedFilter === 'VERIFIED';
      const response = await getDatabaseInstructors(
        page,
        instructorsTable.pageSize,
        searchOverride ?? instructorsTable.search,
        verifiedFilter,
        instructorsTable.sort
      );
      setInstructorsTable((prev) => ({
        ...prev,
        data: response.data,
        total: response.meta.total,
        page: response.meta.page,
        totalPages: response.meta.total_pages,
        loading: false,
      }));
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setInstructorsTable((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  const fetchStudents = async (page = 1, searchOverride?: string) => {
    setStudentsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseStudents(page, studentsTable.pageSize, searchOverride ?? studentsTable.search);
      setStudentsTable((prev) => ({
        ...prev,
        data: response.data,
        total: response.meta.total,
        page: response.meta.page,
        totalPages: response.meta.total_pages,
        loading: false,
      }));
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setStudentsTable((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  const fetchBookings = async (page = 1, searchOverride?: string) => {
    setBookingsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseBookings(
        page,
        bookingsTable.pageSize,
        searchOverride ?? bookingsTable.search,
        bookingStatusFilter === 'ALL' ? undefined : bookingStatusFilter,
        bookingPaymentFilter === 'ALL' ? undefined : bookingPaymentFilter,
        bookingStartDate || undefined,
        bookingEndDate || undefined
      );
      setBookingsTable((prev) => ({
        ...prev,
        data: response.data,
        total: response.meta.total,
        page: response.meta.page,
        totalPages: response.meta.total_pages,
        loading: false,
      }));
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setBookingsTable((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  // Similar for other tables...

  const isReadOnlyTab = READ_ONLY_TABS.includes(activeTab);

  // One place that knows which table state the active tab is showing, so the
  // pagination, export and refresh paths do not each carry their own chain.
  const activeTableState: TableState =
    activeTab === 'users' ? usersTable :
    activeTab === 'admins' ? adminsTable :
    activeTab === 'instructors' ? instructorsTable :
    activeTab === 'students' ? studentsTable :
    activeTab === 'bookings' ? bookingsTable :
    activeTab === 'reviews' ? reviewsTable : schedulesTable;

  searchFetchersRef.current = {
    users: fetchUsers,
    admins: fetchAdmins,
    instructors: fetchInstructors,
    students: fetchStudents,
    bookings: fetchBookings,
  };

  const fetchActiveTable = (page = 1) => {
    switch (activeTab) {
      case 'users': return fetchUsers(page);
      case 'admins': return fetchAdmins(page);
      case 'instructors': return fetchInstructors(page);
      case 'students': return fetchStudents(page);
      case 'bookings': return fetchBookings(page);
      case 'reviews': return fetchReviews(page);
      case 'schedules': return fetchSchedules(page);
    }
  };

  // Open edit modal with ETag
  const openEditModal = async (recordId: number) => {
    try {
      let detail;
      switch (apiTab) {
        case 'users':
          detail = await getUserDetail(recordId);
          break;
        case 'instructors':
          detail = await getInstructorDetail(recordId);
          break;
        case 'students':
          detail = await getStudentDetail(recordId);
          break;
        case 'bookings':
          detail = await getBookingDetail(recordId);
          break;
        default:
          return;
      }
      
      setSelectedRecord(detail.data);
      setSelectedRecordETag(detail.meta.etag);
      setShowEditModal(true);
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  // Open delete modal with ETag
  const openDeleteModal = async (recordId: number, rowType?: string) => {
    try {
      let detail;
      switch (apiTab) {
        case 'users':
          detail = await getUserDetail(recordId);
          // Preserve row_type from the expanded row
          if (rowType) {
            detail.data.row_type = rowType;
          }
          break;
        case 'instructors':
          detail = await getInstructorDetail(recordId);
          break;
        case 'students':
          detail = await getStudentDetail(recordId);
          break;
        case 'bookings':
          detail = await getBookingDetail(recordId);
          break;
        default:
          return;
      }

      setSelectedDeleteRecord(detail.data);
      setSelectedDeleteETag(detail.meta.etag);
      setShowDeleteModal(true);
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
    }
  };

  // Handle edit success
  const handleEditSuccess = (updatedData: any) => {
    setShowEditModal(false);
    setSelectedRecord(null);
    setSelectedRecordETag('');
    setSuccessMessage(`${activeTab} record updated successfully`);
    
    // Auto-dismiss success message
    setTimeout(() => setSuccessMessage(null), 4000);
    
    // Refresh current table
    fetchActiveTable(activeTableState.page);
  };

  // Handle edit error
  const handleEditError = (error: string) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    setErrorMessage(error);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const handleDeleteSuccess = (message: string) => {
    setShowDeleteModal(false);
    setSelectedDeleteRecord(null);
    setSelectedDeleteETag('');
    setSuccessMessage(`${message}`);

    setTimeout(() => setSuccessMessage(null), 4000);

    fetchActiveTable(activeTableState.page);
  };

  const handleDeleteError = (error: string) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    setErrorMessage(error);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // ======================================
  // PHASE 4.1: SORTING & COLUMN MANAGEMENT
  // ======================================

  // Toggle column sort (ascending/descending)
  const handleColumnSort = (column: string) => {
    const currentTable = activeTab === 'users' ? usersTable :
                        activeTab === 'admins' ? adminsTable :
                        activeTab === 'instructors' ? instructorsTable :
                        activeTab === 'students' ? studentsTable : bookingsTable;
    
    const setTable = activeTab === 'users' ? setUsersTable :
                     activeTab === 'admins' ? setAdminsTable :
                     activeTab === 'instructors' ? setInstructorsTable :
                     activeTab === 'students' ? setStudentsTable : setBookingsTable;
    
    const currentSort = currentTable.sort;
    let newSort = column;
    
    // Toggle between ascending and descending
    if (currentSort === column) {
      newSort = `-${column}`;
    } else if (currentSort === `-${column}`) {
      newSort = column;
    }
    
    setTable((prev) => ({ ...prev, sort: newSort }));
    
    // Fetch with new sort
    setTimeout(() => {
      switch (activeTab) {
        case 'users': fetchUsers(1); break;
        case 'admins': fetchAdmins(1); break;
        case 'instructors': fetchInstructors(1); break;
        case 'students': fetchStudents(1); break;
        case 'bookings': fetchBookings(1); break;
      }
    }, 100);
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    const currentSort = activeTab === 'users' ? usersTable.sort :
                       activeTab === 'admins' ? adminsTable.sort :
                       activeTab === 'instructors' ? instructorsTable.sort :
                       activeTab === 'students' ? studentsTable.sort : bookingsTable.sort;
    
    if (currentSort === column) return ' ▲';
    if (currentSort === `-${column}`) return ' ▼';
    return ' ↕';
  };

  const isColumnVisible = (column: string) => (visibleColumns[activeTab] ?? []).includes(column);

  // Column keys to export, in definition order, honouring the picker
  const getExportColumns = (): string[] => {
    const defined = COLUMN_DEFINITIONS[activeTab].map((col) => col.key);
    const visible = visibleColumns[activeTab] ?? defined;
    const selected = defined.filter((key) => visible.includes(key));
    return selected.length > 0 ? selected : defined;
  };

  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns((prev) => {
      const currentColumns = prev[activeTab] ?? [];
      const newColumns = currentColumns.includes(column)
        ? currentColumns.filter((col) => col !== column)
        : [...currentColumns, column];
      
      const updated = { ...prev, [activeTab]: newColumns };
      
      // Persist to localStorage
      if (Platform.OS === 'web') {
        localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  // ======================================
  // PHASE 4.2: BULK OPERATIONS
  // ======================================

  // Toggle row selection
  const toggleRowSelection = (id: number) => {
    setSelectedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Select all visible rows
  const selectAllRows = () => {
    const currentData = activeTableState.data;
    
    const allSelected: { [key: string]: boolean } = {};
    currentData.forEach((item: any) => {
      allSelected[item.id] = true;
    });
    setSelectedRows(allSelected);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedRows({});
  };

  // Get selected IDs
  const getSelectedIds = (): number[] => {
    return Object.keys(selectedRows)
      .filter((id) => selectedRows[id])
      .map((id) => parseInt(id));
  };

  // Bulk status update (uses backend /bulk-update endpoint)
  const handleBulkStatusUpdate = async (newStatus: string) => {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage('No rows selected for bulk update');
      return;
    }
    
    try {
      // Determine field and value based on table and status
      let field: string;
      let value: any;
      
      if (activeTab === 'users' || activeTab === 'admins') {
        field = 'status';
        value = newStatus; // ACTIVE, INACTIVE, SUSPENDED
      } else if (activeTab === 'instructors') {
        field = 'is_verified';
        value = newStatus === 'VERIFIED'; // true/false
      } else if (activeTab === 'bookings') {
        field = 'status';
        value = newStatus; // PENDING, CONFIRMED, COMPLETED, CANCELLED
      } else {
        setErrorMessage('Bulk operations not supported for this table');
        return;
      }
      
      // Call backend API
      const response = await bulkUpdateRecords({
        table: apiTab as 'users' | 'instructors' | 'students' | 'bookings',
        ids: selectedIds,
        field,
        value,
      });
      
      // Show success message
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage(`${response.message}`);
      
      // Close menu and clear selections
      setBulkActionMenuVisible(false);
      clearAllSelections();
      
      // Refresh current table
      fetchActiveTable(activeTableState.page);
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setErrorMessage(errorMsg);
      setBulkActionMenuVisible(false);
    }
  };

  // ======================================
  // PHASE 4.3: EXPORT FUNCTIONALITY
  // ======================================

  // Export to CSV
  const exportToCSV = () => {
    const currentData = activeTableState.data;
    
    if (currentData.length === 0) {
      setErrorMessage('No data to export');
      return;
    }

    // Get column headers
    const headers = getExportColumns();
    
    // Build CSV content
    let csvContent = headers.join(',') + '\\n';
    currentData.forEach((row: any) => {
      const values = headers.map((header) => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('\"'))) {
          return `\"${value.replace(/\"/g, '\"\"')}\"`;
        }
        return value || '';
      });
      csvContent += values.join(',') + '\\n';
    });

    // Add metadata header
    const now = new Date().toISOString();
    const metadata = `# Exported from RoadReady Database Interface\\n# Date: ${now}\\n# Table: ${activeTab}\\n# Total Records: ${currentData.length}\\n\\n`;
    csvContent = metadata + csvContent;

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `roadready_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMessage(`Exported ${currentData.length} ${activeTab} records to CSV`);
  };

  // Export to Excel (XLSX)
  const exportToExcel = async () => {
    const currentData = activeTableState.data;
    
    if (currentData.length === 0) {
      setErrorMessage('No data to export');
      return;
    }

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(activeTab.toUpperCase());

      // Add metadata
      worksheet.addRow(['RoadReady Database Export']);
      worksheet.addRow(['Export Date:', new Date().toISOString()]);
      worksheet.addRow(['Table:', activeTab]);
      worksheet.addRow(['Total Records:', currentData.length]);
      worksheet.addRow([]);

      // Add headers
      const headers = getExportColumns();
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF007AFF' },
      };
      headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Add data rows
      currentData.forEach((row: any) => {
        const values = headers.map((header) => row[header] || '');
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column: any) => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell: any) => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `roadready_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMessage(`Exported ${currentData.length} ${activeTab} records to Excel`);
    } catch (error) {
      setErrorMessage('Failed to export Excel file');
      console.error('Excel export error:', error);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    const currentData = activeTableState.data;
    
    if (currentData.length === 0) {
      setErrorMessage('No data to export');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add metadata
      doc.setFontSize(16);
      doc.text('RoadReady Database Export', 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Export Date: ${new Date().toISOString()}`, 14, 30);
      doc.text(`Table: ${activeTab}`, 14, 35);
      doc.text(`Total Records: ${currentData.length}`, 14, 40);

      // Add table data (simplified - first 5 columns only)
      const headers = getExportColumns().slice(0, 5);
      let yPosition = 50;

      // Headers
      doc.setFontSize(8);
      doc.setFont(doc.getFont().fontName, 'bold');
      headers.forEach((header, index) => {
        doc.text(header, 14 + (index * 35), yPosition);
      });

      // Data rows
      doc.setFont(doc.getFont().fontName, 'normal');
      currentData.forEach((row: any, rowIndex) => {
        yPosition += 7;
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        headers.forEach((header, colIndex) => {
          const value = row[header]?.toString() || '';
          doc.text(value.substring(0, 20), 14 + (colIndex * 35), yPosition);
        });
      });

      // Download
      doc.save(`roadready_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);

      setSuccessMessage(`Exported ${currentData.length} ${activeTab} records to PDF`);
    } catch (error) {
      setErrorMessage('Failed to export PDF file');
      console.error('PDF export error:', error);
    }
  };

  // ======================================
  // DATABASE MANAGEMENT FUNCTIONS
  // ======================================

  const handleBackupDatabase = async () => {
    try {
      setDbAction('backup');
      setErrorMessage('');
      
      const response = await apiService.backupDatabase();
      
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `roadready_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setSuccessMessage('Database backup downloaded successfully!');
      }
      
      setShowDbModal(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Backup failed');
    } finally {
      setDbAction(null);
    }
  };

  const handleResetDatabase = async () => {
    try {
      setDbAction('reset');
      setErrorMessage('');
      
      await apiService.resetDatabase();
      
      await apiService.logout();
      
      setShowDbModal(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setSuccessMessage('Database reset successfully! Please create a new admin account.');
      
      if (Platform.OS === 'web') {
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Reset failed');
    } finally {
      setDbAction(null);
    }
  };

  const handleRestoreFromPC = async () => {
    try {
      setDbAction('restore');
      setErrorMessage('');
      
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const fileContent = event.target?.result as string;
              const blob = new Blob([fileContent], { type: 'application/json' });
              await apiService.restoreDatabase(blob);
              setSuccessMessage('Database restored successfully!');
              setShowDbModal(false);
              // Refresh current table
              fetchActiveTable(1);
            } catch (err: any) {
              setErrorMessage(err.response?.data?.detail || 'Restore failed');
            } finally {
              setDbAction(null);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Restore from local file failed');
    } finally {
      setDbAction(null);
    }
  };

  // ======================================
  // PHASE 4.4: ENHANCED SEARCH
  // ======================================

  // Add search to history
  const addToSearchHistory = (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    setSearchHistory((prev) => {
      // Remove duplicates and add new term
      const filtered = prev.filter((term) => term !== searchTerm);
      const updated = [searchTerm, ...filtered].slice(0, 10); // Keep last 10
      
      // Persist to localStorage
      if (Platform.OS === 'web') {
        localStorage.setItem('dbInterfaceSearchHistory', JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  // Load search history from localStorage
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const saved = localStorage.getItem('dbInterfaceSearchHistory');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  // Load column preferences from localStorage
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const saved = localStorage.getItem(COLUMN_PREFS_KEY);
    if (saved) {
      try {
        // Drop anything that is no longer a real column so preferences saved
        // against the old key names cannot hide every column.
        const parsed = JSON.parse(saved);
        const merged = { ...ALL_COLUMN_KEYS };
        (Object.keys(ALL_COLUMN_KEYS) as TabType[]).forEach((tab) => {
          if (!Array.isArray(parsed?.[tab])) return;
          const valid = parsed[tab].filter((col: string) => ALL_COLUMN_KEYS[tab].includes(col));
          if (valid.length > 0) merged[tab] = valid;
        });
        setVisibleColumns(merged);
      } catch (error) {
        console.error('Failed to load column preferences:', error);
      }
    }
  }, []);

  // Load data on tab change
  useEffect(() => {
    if (!platformDetection.isPlatformAllowed) return;

    // Row selections are ids into the previous tab's table; carrying them
    // across would point bulk actions at the wrong records.
    clearAllSelections();
    setBulkActionMenuVisible(false);
    fetchActiveTable();
  }, [activeTab, platformDetection.isPlatformAllowed]);

  useEffect(() => {
    if (!platformDetection.isPlatformAllowed || activeTab !== 'users') return;
    fetchUsers(1);
  }, [userRoleFilter, userStatusFilter]);

  useEffect(() => {
    if (!platformDetection.isPlatformAllowed || activeTab !== 'instructors') return;
    fetchInstructors(1);
  }, [instructorVerifiedFilter]);

  useEffect(() => {
    if (!platformDetection.isPlatformAllowed || activeTab !== 'bookings') return;
    fetchBookings(1);
  }, [bookingStatusFilter, bookingPaymentFilter, bookingStartDate, bookingEndDate]);

  // Load filters from localStorage on mount
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const savedFilters = localStorage.getItem('dbInterfaceFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.userRoleFilter) setUserRoleFilter(filters.userRoleFilter);
        if (filters.userStatusFilter) setUserStatusFilter(filters.userStatusFilter);
        if (filters.instructorVerifiedFilter) setInstructorVerifiedFilter(filters.instructorVerifiedFilter);
        if (filters.bookingStatusFilter) setBookingStatusFilter(filters.bookingStatusFilter);
        if (filters.bookingPaymentFilter) setBookingPaymentFilter(filters.bookingPaymentFilter);
        if (filters.bookingStartDate) setBookingStartDate(filters.bookingStartDate);
        if (filters.bookingEndDate) setBookingEndDate(filters.bookingEndDate);
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const filters = {
      userRoleFilter,
      userStatusFilter,
      instructorVerifiedFilter,
      bookingStatusFilter,
      bookingPaymentFilter,
      bookingStartDate,
      bookingEndDate,
    };
    
    localStorage.setItem('dbInterfaceFilters', JSON.stringify(filters));
  }, [userRoleFilter, userStatusFilter, instructorVerifiedFilter, bookingStatusFilter, bookingPaymentFilter, bookingStartDate, bookingEndDate]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  // Keyboard navigation (Page Up/Down for pagination)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Page Up - Previous page
      if (event.key === 'PageUp') {
        event.preventDefault();
        if (activeTableState.page > 1) {
          fetchActiveTable(activeTableState.page - 1);
        }
      }
      // Page Down - Next page
      else if (event.key === 'PageDown') {
        event.preventDefault();
        if (activeTableState.page < activeTableState.totalPages) {
          fetchActiveTable(activeTableState.page + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, activeTableState.page, activeTableState.totalPages]);

  // Platform check - show access denied
  if (!platformDetection.isPlatformAllowed) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebNavigationHeader title="Database Interface" onBack={() => navigation.goBack()} showBackButton={true} />
        
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedIcon}></Text>
          <Text style={[styles.accessDeniedTitle, { color: colors.danger }]}>Access Denied</Text>
          <Text style={[styles.accessDeniedMessage, { color: colors.textSecondary }]}>{platformDetection.platformWarning}</Text>
          
          <View style={[styles.platformInfo, { backgroundColor: colors.warningBg }]}>
            <Text style={[styles.platformInfoTitle, { color: colors.text }]}>Supported Platforms:</Text>
            <Text style={[styles.platformInfoText, { color: colors.textSecondary }]}>Windows 10/11</Text>
            <Text style={[styles.platformInfoText, { color: colors.textSecondary }]}>Chrome, Edge, Firefox</Text>
            <Text style={[styles.platformInfoText, { color: colors.textSecondary }]}>Minimum resolution: 1024x600</Text>
            
            <Text style={[styles.platformInfoTitle, { marginTop: 16, color: colors.text }]}>Your System:</Text>
            <Text style={[styles.platformInfoText, { color: colors.textSecondary }]}>OS: {platformDetection.isWindows ? 'Windows' : 'Other'}</Text>
            <Text style={[styles.platformInfoText, { color: colors.textSecondary }]}>Device: {platformDetection.isMobile ? 'Mobile' : platformDetection.isTablet ? 'Tablet' : 'Desktop'}</Text>
            <Text style={[styles.platformInfoText, { color: colors.textSecondary }]}>Browser: {platformDetection.browserName}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Main interface
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader title="Database Interface" onBack={() => navigation.goBack()} showBackButton={true} />

      <ScrollView ref={scrollViewRef} style={styles.content}>
        {/* Success/Error Messages */}
        {successMessage && (
          <View style={[styles.successMessage, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>{successMessage}</Text>
          </View>
        )}
        {errorMessage && (
          <View style={[styles.errorMessage, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>{errorMessage}</Text>
          </View>
        )}

        {/* Main Admin Protection Info (Users + Admins tabs) */}
        {(activeTab === 'users' || activeTab === 'admins') && (
          <View style={[styles.infoMessage, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>
              The original admin account (ID: 1) cannot be suspended. 
              You can still delete Student/Instructor profiles but the Admin role is protected.
            </Text>
          </View>
        )}

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabNavigation, { borderBottomColor: colors.border }]}>
          {(['users', 'admins', 'instructors', 'students', 'bookings', 'reviews', 'schedules'] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && { color: colors.primary, fontWeight: '600' }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Search & Filter */}
        <View style={styles.filterSection}>
          {!isReadOnlyTab && (
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Search..."
              placeholderTextColor={colors.inputPlaceholder}
              accessibilityLabel="Search database records"
              accessibilityHint="Type to search and results will update after 300ms"
              value={activeTableState.search}
              onChangeText={(text) => handleSearchChange(text, activeTab)}
            />
          )}

          {activeTab === 'users' && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Role</Text>
              <View style={styles.filterChips}>
                {(['ALL', 'ADMIN', 'INSTRUCTOR', 'STUDENT'] as const).map((role) => (
                  <Pressable
                    key={role}
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, userRoleFilter === role && { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.12) }]}
                    onPress={() => setUserRoleFilter(role)}
                  >
                    <Text style={[styles.filterChipText, { color: colors.textSecondary }, userRoleFilter === role && { color: colors.primary }]}>
                      {role}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={styles.filterChips}>
                {(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, userStatusFilter === status && { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.12) }]}
                    onPress={() => setUserStatusFilter(status)}
                  >
                    <Text style={[styles.filterChipText, { color: colors.textSecondary }, userStatusFilter === status && { color: colors.primary }]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'instructors' && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Verified</Text>
              <View style={styles.filterChips}>
                {(['ALL', 'VERIFIED', 'UNVERIFIED'] as const).map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, instructorVerifiedFilter === status && { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.12) }]}
                    onPress={() => setInstructorVerifiedFilter(status)}
                  >
                    <Text style={[styles.filterChipText, { color: colors.textSecondary }, instructorVerifiedFilter === status && { color: colors.primary }]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'bookings' && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Booking Status</Text>
              <View style={styles.filterChips}>
                {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, bookingStatusFilter === status && { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.12) }]}
                    onPress={() => setBookingStatusFilter(status)}
                  >
                    <Text style={[styles.filterChipText, { color: colors.textSecondary }, bookingStatusFilter === status && { color: colors.primary }]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Payment Status</Text>
              <View style={styles.filterChips}>
                {(['ALL', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const).map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, bookingPaymentFilter === status && { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.12) }]}
                    onPress={() => setBookingPaymentFilter(status)}
                  >
                    <Text style={[styles.filterChipText, { color: colors.textSecondary }, bookingPaymentFilter === status && { color: colors.primary }]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date Range</Text>
              <View style={styles.dateRangeContainer}>
                <View style={styles.dateInputWrapper}>
                  <Text style={[styles.dateInputLabel, { color: colors.text }]}>From:</Text>
                  <TextInput
                    style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={bookingStartDate}
                    onChangeText={setBookingStartDate}
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={[styles.dateInputLabel, { color: colors.text }]}>To:</Text>
                  <TextInput
                    style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={bookingEndDate}
                    onChangeText={setBookingEndDate}
                  />
                </View>
                {(bookingStartDate || bookingEndDate) && (
                  <Pressable
                    style={[styles.clearDatesButton, { backgroundColor: colors.textSecondary }]}
                    onPress={() => {
                      setBookingStartDate('');
                      setBookingEndDate('');
                    }}
                  >
                    <Text style={styles.clearDatesText}>Clear</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>

        {/* PHASE 4: Export Toolbar & Bulk Operations */}
        <View style={[styles.toolbarSection, { backgroundColor: colors.card }]}>
          {/* Export Buttons */}
          <View style={styles.exportButtons}>
            <Text style={[styles.toolbarTitle, { color: colors.text }]}>Export:</Text>
            <Pressable
              style={[styles.exportButton, { backgroundColor: colors.success }]}
              onPress={exportToCSV}
              accessibilityRole="button"
              accessibilityLabel="Export to CSV"
            >
              <Text style={styles.exportButtonText}>CSV</Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, { backgroundColor: colors.success }]}
              onPress={exportToExcel}
              accessibilityRole="button"
              accessibilityLabel="Export to Excel"
            >
              <Text style={styles.exportButtonText}>Excel</Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, { backgroundColor: colors.success }]}
              onPress={exportToPDF}
              accessibilityRole="button"
              accessibilityLabel="Export to PDF"
            >
              <Text style={styles.exportButtonText}>PDF</Text>
            </Pressable>
          </View>

          {/* Database Management Buttons */}
          <View style={styles.exportButtons}>
            <Text style={[styles.toolbarTitle, { color: colors.text }]}>Database:</Text>
            <Pressable
              style={[styles.exportButton, { backgroundColor: colors.primary }]}
              onPress={handleBackupDatabase}
              disabled={!!dbAction}
              accessibilityRole="button"
              accessibilityLabel="Backup Database"
            >
              {dbAction === 'backup' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.exportButtonText}>Backup to PC</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.exportButton, { backgroundColor: colors.success }]}
              onPress={handleRestoreFromPC}
              disabled={!!dbAction}
              accessibilityRole="button"
              accessibilityLabel="Restore Database"
            >
              {dbAction === 'restore' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.exportButtonText}>Restore from Backup</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.exportButton, { backgroundColor: colors.buttonDanger }]}
              onPress={handleResetDatabase}
              disabled={!!dbAction}
              accessibilityRole="button"
              accessibilityLabel="Reset Database"
            >
              {dbAction === 'reset' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.exportButtonText}>Reset Database</Text>
              )}
            </Pressable>
          </View>

          {/* Column Visibility Toggle */}
          <View style={styles.columnControls}>
            <Pressable
              style={[styles.columnToggleButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => setShowColumnDropdown(!showColumnDropdown)}
              accessibilityRole="button"
              accessibilityLabel="Toggle column visibility"
            >
              <Text style={styles.columnToggleButtonText}>Columns</Text>
            </Pressable>
          </View>

          {/* Bulk Operations */}
          {getSelectedIds().length > 0 && (
            <View style={styles.bulkActions}>
              <Text style={[styles.bulkActionsText, { color: colors.primary }]}>
                {getSelectedIds().length} row{getSelectedIds().length > 1 ? 's' : ''} selected
              </Text>
              <Pressable
                style={[styles.bulkActionButton, { backgroundColor: colors.primary }]}
                onPress={() => setBulkActionMenuVisible(!bulkActionMenuVisible)}
              >
                <Text style={styles.bulkActionButtonText}>Bulk Actions</Text>
              </Pressable>
              <Pressable
                style={[styles.clearSelectionButton, { backgroundColor: colors.buttonDanger }]}
                onPress={clearAllSelections}
              >
                <Text style={styles.clearSelectionText}>Clear</Text>
              </Pressable>
            </View>
          )}

          {/* Select All Button (read-only tables have no row selection) */}
          {!getSelectedIds().length && !isReadOnlyTab && (
            <Pressable
              style={[styles.selectAllButton, { backgroundColor: colors.textSecondary }]}
              onPress={selectAllRows}
            >
              <Text style={styles.selectAllText}>Select All</Text>
            </Pressable>
          )}
        </View>

        {/* Bulk Action Menu (conditional) */}
        {bulkActionMenuVisible && (
          <View style={[styles.bulkActionMenu, { backgroundColor: colors.card }]}>
            <Pressable
              style={styles.bulkMenuItem}
              onPress={() => handleBulkStatusUpdate('ACTIVE')}
            >
              <Text style={[styles.bulkMenuItemText, { color: colors.text }]}>Activate Selected</Text>
            </Pressable>
            <Pressable
              style={styles.bulkMenuItem}
              onPress={() => handleBulkStatusUpdate('INACTIVE')}
            >
              <Text style={[styles.bulkMenuItemText, { color: colors.text }]}>Deactivate Selected</Text>
            </Pressable>
            <Pressable
              style={styles.bulkMenuItem}
              onPress={() => handleBulkStatusUpdate('SUSPENDED')}
            >
              <Text style={[styles.bulkMenuItemText, { color: colors.text }]}>Suspend Selected</Text>
            </Pressable>
          </View>
        )}

        {/* Table Loading */}
        {activeTableState.loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        )}

        {/* Table Data */}
        {activeTab === 'users' && !usersTable.loading && usersTable.data.length > 0 && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <View style={{ flex: 0.5 }}>
                <Pressable
                  onPress={selectAllRows}
                  style={styles.headerCheckbox}
                  accessibilityRole="checkbox"
                  accessibilityLabel="Select all rows"
                accessibilityState={{ checked: getSelectedIds().length > 0 }}
                // RNW 0.21 does not emit aria-checked from accessibilityState here.
                {...({ 'aria-checked': getSelectedIds().length > 0 } as any)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.primary },
                    getSelectedIds().length === usersTable.data.length && { backgroundColor: colors.primary }
                  ]}>
                    {getSelectedIds().length === usersTable.data.length && (
                      <Text style={styles.checkboxIcon}>✓</Text>
                    )}
                  </View>
                </Pressable>
              </View>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>ID</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>Name</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Email</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Role</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Status</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Actions</Text>
            </View>
            {usersTable.data.map((user, idx) => {
              const userStatus = String(user.status || '').toUpperCase();

              return (
              <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 0.5 }}>
                  <Pressable
                    onPress={() => toggleRowSelection(user.id)}
                    style={styles.rowCheckbox}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !!selectedRows[user.id] }}
                  accessibilityLabel={t('common.selectRow', { id: user.id })}
                  {...({ 'aria-checked': !!selectedRows[user.id] } as any)}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: colors.primary },
                      selectedRows[user.id] && { backgroundColor: colors.primary }
                    ]}>
                      {selectedRows[user.id] && (
                        <Text style={styles.checkboxIcon}>✓</Text>
                      )}
                    </View>
                  </Pressable>
                </View>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{user.id}</Text>
                <View style={{ flex: 3, flexDirection: 'column' }}>
                  <Text style={[styles.tableCell, { color: colors.text }]}>{user.first_name} {user.last_name}</Text>
                  {user.id === 1 && user.role === 'admin' && (!user.row_type || user.row_type === 'primary') && (
                    <Text style={[styles.protectedBadge, { color: colors.warning }]}>PROTECTED ADMIN</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{user.email}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>
                  {user.role}
                  {user.id === 1 && user.role === 'admin' && (!user.row_type || user.row_type === 'primary') && ' '}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      flex: 1,
                      fontWeight: '600',
                      color:
                        userStatus === 'SUSPENDED'
                          ? colors.warning
                          : userStatus === 'INACTIVE'
                            ? colors.textSecondary
                            : colors.success,
                    },
                  ]}
                >
                  {userStatus === 'SUSPENDED'
                    ? 'SUSPENDED'
                    : userStatus === 'INACTIVE'
                      ? 'INACTIVE'
                      : 'ACTIVE'}
                </Text>
                <View style={styles.actionButtons}>
                  <Pressable
                    style={[styles.editButton, { backgroundColor: colors.primary }]}
                    onPress={() => openEditModal(user.id)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  {/* Hide suspend button for main admin (ID=1, role=admin, primary row) */}
                  {!(user.id === 1 && user.role === 'admin' && (!user.row_type || user.row_type === 'primary')) ? (
                    <Pressable
                      style={[
                        styles.deleteButton,
                        { backgroundColor: colors.buttonDanger },
                        userStatus === 'ACTIVE' && { backgroundColor: colors.success },
                        userStatus === 'SUSPENDED' && { backgroundColor: colors.warning }
                      ]}
                      onPress={() => openDeleteModal(user.id, user.row_type)}
                    >
                      <Text style={styles.deleteButtonText}>
                        {userStatus === 'SUSPENDED' ? 'Suspended' : 'Active'}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={{ minWidth: 80 }} />
                  )}
                </View>
              </View>
            );
            })}
          </View>
        )}

        {/* Admins Table */}
        {activeTab === 'admins' && !adminsTable.loading && adminsTable.data.length > 0 && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <View style={{ flex: 0.5 }}>
                <Pressable
                  onPress={selectAllRows}
                  style={styles.headerCheckbox}
                  accessibilityRole="checkbox"
                  accessibilityLabel="Select all rows"
                  accessibilityState={{ checked: getSelectedIds().length > 0 }}
                  {...({ 'aria-checked': getSelectedIds().length > 0 } as any)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.primary },
                    getSelectedIds().length === adminsTable.data.length && { backgroundColor: colors.primary }
                  ]}>
                    {getSelectedIds().length === adminsTable.data.length && (
                      <Text style={styles.checkboxIcon}>✓</Text>
                    )}
                  </View>
                </Pressable>
              </View>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>ID</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>Name</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>Email</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Phone</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Status</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Actions</Text>
            </View>
            {adminsTable.data.map((admin: any, idx: number) => {
              const adminStatus = String(admin.status || '').toUpperCase();
              const isProtected = admin.id === 1;

              return (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 0.5 }}>
                    <Pressable
                      onPress={() => toggleRowSelection(admin.id)}
                      style={styles.rowCheckbox}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: !!selectedRows[admin.id] }}
                      accessibilityLabel={t('common.selectRow', { id: admin.id })}
                      {...({ 'aria-checked': !!selectedRows[admin.id] } as any)}
                    >
                      <View style={[
                        styles.checkbox,
                        { borderColor: colors.primary },
                        selectedRows[admin.id] && { backgroundColor: colors.primary }
                      ]}>
                        {selectedRows[admin.id] && (
                          <Text style={styles.checkboxIcon}>✓</Text>
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{admin.id}</Text>
                  <View style={{ flex: 3, flexDirection: 'column' }}>
                    <Text style={[styles.tableCell, { color: colors.text }]}>{admin.first_name} {admin.last_name}</Text>
                    {isProtected && (
                      <Text style={[styles.protectedBadge, { color: colors.warning }]}>PROTECTED ADMIN</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]} numberOfLines={1}>{admin.email}</Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{admin.phone || '-'}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        flex: 1,
                        fontWeight: '600',
                        color:
                          adminStatus === 'SUSPENDED'
                            ? colors.warning
                            : adminStatus === 'INACTIVE'
                              ? colors.textSecondary
                              : colors.success,
                      },
                    ]}
                  >
                    {adminStatus || 'ACTIVE'}
                  </Text>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.editButton, { backgroundColor: colors.primary }]}
                      onPress={() => openEditModal(admin.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit admin ${admin.first_name} ${admin.last_name}`}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    {!isProtected ? (
                      <Pressable
                        style={[
                          styles.deleteButton,
                          { backgroundColor: colors.buttonDanger },
                          adminStatus === 'ACTIVE' && { backgroundColor: colors.success },
                          adminStatus === 'SUSPENDED' && { backgroundColor: colors.warning }
                        ]}
                        onPress={() => openDeleteModal(admin.id, admin.row_type)}
                        accessibilityRole="button"
                        accessibilityLabel={`Toggle status for admin ${admin.first_name} ${admin.last_name}`}
                      >
                        <Text style={styles.deleteButtonText}>
                          {adminStatus === 'SUSPENDED' ? 'Suspended' : 'Active'}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={{ minWidth: 80 }} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Instructors Table */}
        {activeTab === 'instructors' && !instructorsTable.loading && instructorsTable.data.length > 0 && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <View style={{ flex: 0.5 }}>
                <Pressable
                  onPress={selectAllRows}
                  style={styles.headerCheckbox}
                  accessibilityRole="checkbox"
                  accessibilityLabel="Select all rows"
                accessibilityState={{ checked: getSelectedIds().length > 0 }}
                // RNW 0.21 does not emit aria-checked from accessibilityState here.
                {...({ 'aria-checked': getSelectedIds().length > 0 } as any)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.primary },
                    getSelectedIds().length === instructorsTable.data.length && { backgroundColor: colors.primary }
                  ]}>
                    {getSelectedIds().length === instructorsTable.data.length && (
                      <Text style={styles.checkboxIcon}>✓</Text>
                    )}
                  </View>
                </Pressable>
              </View>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>ID</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>Name</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>License #</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Vehicle</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Rate</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Verified</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Actions</Text>
            </View>
            {instructorsTable.data.map((instructor: any, idx: number) => (
              <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 0.5 }}>
                  <Pressable
                    onPress={() => toggleRowSelection(instructor.id)}
                    style={styles.rowCheckbox}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !!selectedRows[instructor.id] }}
                  accessibilityLabel={t('common.selectRow', { id: instructor.id })}
                  {...({ 'aria-checked': !!selectedRows[instructor.id] } as any)}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: colors.primary },
                      selectedRows[instructor.id] && { backgroundColor: colors.primary }
                    ]}>
                      {selectedRows[instructor.id] && (
                        <Text style={styles.checkboxIcon}>✓</Text>
                      )}
                    </View>
                  </Pressable>
                </View>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{instructor.id}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>{instructor.instructor_name}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{instructor.license_number || 'N/A'}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>
                  {instructor.vehicle_make ? `${instructor.vehicle_make} ${instructor.vehicle_model || ''}`.trim() : 'N/A'}
                </Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>
                  {instructor.hourly_rate ? `R${instructor.hourly_rate}` : 'N/A'}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      flex: 1,
                      fontWeight: '600',
                      color: instructor.is_verified ? colors.success : colors.warning,
                    },
                  ]}
                >
                  {instructor.is_verified ? 'Yes' : 'No'}
                </Text>
                <View style={styles.actionButtons}>
                  <Pressable
                    style={[styles.editButton, { backgroundColor: colors.primary }]}
                    onPress={() => openEditModal(instructor.id)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteButton, { backgroundColor: colors.buttonDanger }]}
                    onPress={() => openDeleteModal(instructor.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Students Table */}
        {activeTab === 'students' && !studentsTable.loading && studentsTable.data.length > 0 && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <View style={{ flex: 0.5 }}>
                <Pressable
                  onPress={selectAllRows}
                  style={styles.headerCheckbox}
                  accessibilityRole="checkbox"
                  accessibilityLabel="Select all rows"
                accessibilityState={{ checked: getSelectedIds().length > 0 }}
                // RNW 0.21 does not emit aria-checked from accessibilityState here.
                {...({ 'aria-checked': getSelectedIds().length > 0 } as any)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.primary },
                    getSelectedIds().length === studentsTable.data.length && { backgroundColor: colors.primary }
                  ]}>
                    {getSelectedIds().length === studentsTable.data.length && (
                      <Text style={styles.checkboxIcon}>✓</Text>
                    )}
                  </View>
                </Pressable>
              </View>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>ID</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>Name</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Email</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>City</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Actions</Text>
            </View>
            {studentsTable.data.map((student, idx) => (
              <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 0.5 }}>
                  <Pressable
                    onPress={() => toggleRowSelection(student.id)}
                    style={styles.rowCheckbox}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !!selectedRows[student.id] }}
                  accessibilityLabel={t('common.selectRow', { id: student.id })}
                  {...({ 'aria-checked': !!selectedRows[student.id] } as any)}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: colors.primary },
                      selectedRows[student.id] && { backgroundColor: colors.primary }
                    ]}>
                      {selectedRows[student.id] && (
                        <Text style={styles.checkboxIcon}>✓</Text>
                      )}
                    </View>
                  </Pressable>
                </View>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{student.id}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>{student.student_name}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{student.email}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{student.city || 'N/A'}</Text>
                <View style={styles.actionButtons}>
                  <Pressable
                    style={[styles.editButton, { backgroundColor: colors.primary }]}
                    onPress={() => openEditModal(student.id)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteButton, { backgroundColor: colors.buttonDanger }]}
                    onPress={() => openDeleteModal(student.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bookings Table */}
        {activeTab === 'bookings' && !bookingsTable.loading && bookingsTable.data.length > 0 && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <View style={{ flex: 0.5 }}>
                <Pressable
                  onPress={selectAllRows}
                  style={styles.headerCheckbox}
                  accessibilityRole="checkbox"
                  accessibilityLabel="Select all rows"
                accessibilityState={{ checked: getSelectedIds().length > 0 }}
                // RNW 0.21 does not emit aria-checked from accessibilityState here.
                {...({ 'aria-checked': getSelectedIds().length > 0 } as any)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.primary },
                    getSelectedIds().length === bookingsTable.data.length && { backgroundColor: colors.primary }
                  ]}>
                    {getSelectedIds().length === bookingsTable.data.length && (
                      <Text style={styles.checkboxIcon}>✓</Text>
                    )}
                  </View>
                </Pressable>
              </View>
              <Text style={[styles.tableCell, { color: colors.text, flex: 0.5 }]}>ID</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1.5 }]}>Reference</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Student</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Instructor</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Lesson Date</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Status</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Payment</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Amount</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Actions</Text>
            </View>
            {bookingsTable.data.map((booking: any, idx: number) => {
              const bStatus = String(booking.status || '').toUpperCase();
              const pStatus = String(booking.payment_status || '').toUpperCase();
              return (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 0.5 }}>
                    <Pressable
                      onPress={() => toggleRowSelection(booking.id)}
                      style={styles.rowCheckbox}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: !!selectedRows[booking.id] }}
                    accessibilityLabel={t('common.selectRow', { id: booking.id })}
                    {...({ 'aria-checked': !!selectedRows[booking.id] } as any)}
                    >
                      <View style={[
                        styles.checkbox,
                        { borderColor: colors.primary },
                        selectedRows[booking.id] && { backgroundColor: colors.primary }
                      ]}>
                        {selectedRows[booking.id] && (
                          <Text style={styles.checkboxIcon}>✓</Text>
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 0.5 }]}>{booking.id}</Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 1.5 }]} numberOfLines={1}>{booking.booking_reference || '-'}</Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{booking.student_id}</Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{booking.instructor_id}</Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>
                    {booking.lesson_date ? new Date(booking.lesson_date).toLocaleDateString() + ' ' + new Date(booking.lesson_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        flex: 1,
                        fontWeight: '600',
                        color:
                          bStatus === 'CANCELLED' || bStatus === 'NO_SHOW'
                            ? colors.danger
                            : bStatus === 'COMPLETED'
                              ? colors.success
                              : bStatus === 'CONFIRMED'
                                ? colors.primary
                                : colors.warning,
                      },
                    ]}
                  >
                    {bStatus || '-'}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        flex: 1,
                        fontWeight: '600',
                        color:
                          pStatus === 'PAID'
                            ? colors.success
                            : pStatus === 'FAILED'
                              ? colors.danger
                              : pStatus === 'REFUNDED'
                                ? colors.primary
                                : colors.warning,
                      },
                    ]}
                  >
                    {pStatus || '-'}
                  </Text>
                  <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>
                    {booking.amount != null ? `R${Number(booking.amount).toFixed(2)}` : '-'}
                  </Text>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.editButton, { backgroundColor: colors.primary }]}
                      onPress={() => openEditModal(booking.id)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.deleteButton, { backgroundColor: colors.buttonDanger }]}
                      onPress={() => openDeleteModal(booking.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Reviews Table (read-only: the endpoint is list-only) */}
        {activeTab === 'reviews' && !reviewsTable.loading && reviewsTable.data.length > 0 && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>ID</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Booking</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Student</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Instructor</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Rating</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 4 }]}>Comment</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Created</Text>
            </View>
            {reviewsTable.data.map((review: any, idx: number) => (
              <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{review.id}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{review.booking_id ?? '-'}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{review.student_id ?? '-'}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{review.instructor_id ?? '-'}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1, fontWeight: '600' }]}>
                  {review.rating != null ? `${review.rating} / 5` : '-'}
                </Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 4 }]} numberOfLines={2}>
                  {review.comment || '-'}
                </Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{formatDate(review.created_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Schedules Table (read-only: the endpoint is list-only) */}
        {activeTab === 'schedules' && !schedulesTable.loading && schedulesTable.data.length > 0 && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>ID</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>Instructor</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Day of Week</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>Start</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>End</Text>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>Available</Text>
            </View>
            {schedulesTable.data.map((schedule: any, idx: number) => (
              <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{schedule.id}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]} numberOfLines={1}>
                  {schedule.instructor_name || `#${schedule.instructor_id}`}
                </Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{formatDay(schedule.day_of_week)}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{formatTime(schedule.start_time)}</Text>
                <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{formatTime(schedule.end_time)}</Text>
                <Text
                  style={[
                    styles.tableCell,
                    { flex: 1, fontWeight: '600', color: schedule.is_available ? colors.success : colors.textSecondary },
                  ]}
                >
                  {schedule.is_available ? 'Yes' : 'No'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {activeTab === 'users' && !usersTable.loading && usersTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No users found</Text>
          </View>
        )}
        {activeTab === 'admins' && !adminsTable.loading && adminsTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No admins found</Text>
          </View>
        )}
        {activeTab === 'instructors' && !instructorsTable.loading && instructorsTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No instructors found</Text>
          </View>
        )}
        {activeTab === 'students' && !studentsTable.loading && studentsTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No students found</Text>
          </View>
        )}
        {activeTab === 'bookings' && !bookingsTable.loading && bookingsTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No bookings found</Text>
          </View>
        )}
        {activeTab === 'reviews' && !reviewsTable.loading && reviewsTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No reviews found</Text>
          </View>
        )}
        {activeTab === 'schedules' && !schedulesTable.loading && schedulesTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No schedules found</Text>
          </View>
        )}

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          <Pressable
            disabled={activeTableState.page <= 1}
            onPress={() => fetchActiveTable(activeTableState.page - 1)}
            style={[
              styles.paginationButton,
              { backgroundColor: colors.primary },
              activeTableState.page <= 1 && { backgroundColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to previous page"
            accessibilityState={{ disabled: activeTableState.page <= 1 }}
          >
            <Text style={styles.paginationButtonText}>◀ Previous</Text>
          </Pressable>

          <Text style={[styles.paginationInfo, { color: colors.textSecondary }]}>
            Page {activeTableState.page} of {activeTableState.totalPages}
          </Text>

          <Pressable
            disabled={activeTableState.page >= activeTableState.totalPages}
            onPress={() => fetchActiveTable(activeTableState.page + 1)}
            style={[
              styles.paginationButton,
              { backgroundColor: colors.primary },
              activeTableState.page >= activeTableState.totalPages && { backgroundColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to next page"
            accessibilityState={{ disabled: activeTableState.page >= activeTableState.totalPages }}
          >
            <Text style={styles.paginationButtonText}>Next ▶</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Form Modal */}
      {selectedRecord && (
        <DatabaseEditForm
          visible={showEditModal}
          tableType={apiTab}
          recordId={selectedRecord.id}
          currentData={selectedRecord}
          etag={selectedRecordETag}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRecord(null);
            setSelectedRecordETag('');
          }}
          onSuccess={handleEditSuccess}
          onError={handleEditError}
        />
      )}

      {/* Column Visibility Dropdown Modal */}
      <ThemedModal
        visible={showColumnDropdown}
        onClose={() => setShowColumnDropdown(false)}
        title="Column Visibility"
        size="sm"
        footer={
          <Button
            variant="secondary"
            onPress={() => setShowColumnDropdown(false)}
          >
            Close
          </Button>
        }
      >
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
          Select columns to display in the table
        </Text>
        
        <ScrollView style={{ maxHeight: 300 }}>
          {getColumnDefinitions(activeTab).map((column) => (
            <Pressable
              key={column.key}
              style={[styles.columnCheckboxItem, { borderBottomColor: colors.border }]}
              onPress={() => toggleColumnVisibility(column.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isColumnVisible(column.key) }}
            >
              <View style={styles.columnCheckboxRow}>
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.primary },
                  isColumnVisible(column.key) && { backgroundColor: colors.primary }
                ]}>
                  {isColumnVisible(column.key) && (
                    <Text style={styles.checkboxIcon}>✓</Text>
                  )}
                </View>
                <Text style={[styles.columnCheckboxLabel, { color: colors.text }]}>{column.label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedModal>

      {selectedDeleteRecord && isDeletableTab(apiTab) && (
        <DatabaseDeleteConfirm
          visible={showDeleteModal}
          tableType={apiTab}
          record={selectedDeleteRecord}
          etag={selectedDeleteETag}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedDeleteRecord(null);
            setSelectedDeleteETag('');
          }}
          onDeleted={handleDeleteSuccess}
          onError={handleDeleteError}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Platform.OS === 'web' ? 20 : 12,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  accessDeniedIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  accessDeniedMessage: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
    textAlign: 'center' as const,
  },
  platformInfo: {
    borderRadius: 8,
    padding: 16,
    width: '100%' as const,
  },
  platformInfoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  platformInfoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  successMessage: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  errorMessage: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  infoMessage: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  tabNavigation: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontFamily: 'Inter_500Medium',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterRow: {
    marginTop: 12,
    gap: Platform.OS === 'web' ? 8 : 6,
  },
  filterLabel: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  filterChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Platform.OS === 'web' ? 8 : 6,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
  },
  filterChipText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  dateRangeContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Platform.OS === 'web' ? 12 : 8,
    flexWrap: 'wrap' as const,
    marginTop: 8,
  },
  dateInputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: 'Inter_500Medium',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minWidth: 130,
  },
  clearDatesButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  clearDatesText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  searchInput: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  loadingContainer: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  table: {
    borderRadius: 4,
    overflow: 'hidden' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center' as const,
  },
  tableCell: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 70,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: Platform.OS === 'web' ? 8 : 6,
    justifyContent: 'flex-start' as const,
    minWidth: 180,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 80,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center' as const,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center' as const,
  },
  protectedBadge: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  emptyState: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 48,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  paginationContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  paginationInfo: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  // Toolbar & Export Styles
  toolbarSection: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    rowGap: 10,
    columnGap: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  exportButtons: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 2,
  },
  exportButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    minHeight: 36,
    justifyContent: 'center' as const,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  bulkActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  bulkActionsText: {
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  bulkActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    minHeight: 36,
    justifyContent: 'center' as const,
  },
  bulkActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  clearSelectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearSelectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  selectAllButton: {
    alignSelf: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    minHeight: 36,
    justifyContent: 'center' as const,
  },
  selectAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  bulkActionMenu: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  bulkMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  bulkMenuItemText: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  // Column Visibility Styles
  columnControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  columnToggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    minHeight: 36,
    justifyContent: 'center' as const,
  },
  columnToggleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  columnCheckboxItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  columnCheckboxRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  checkboxIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  headerCheckbox: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 4,
  },
  rowCheckbox: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 4,
  },
  columnCheckboxLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});

// Memoized table row component for performance
// eslint-disable-next-line react/display-name -- displayName assigned below
const TableRow = React.memo(({
  user, 
  onEdit, 
  onDelete 
}: { 
  user: any; 
  onEdit: (id: number) => void; 
  onDelete: (id: number) => void;
}) => {
  const { colors } = useTheme();
  return (
  <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
    <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{user.id}</Text>
    <Text style={[styles.tableCell, { color: colors.text, flex: 3 }]}>{user.first_name} {user.last_name}</Text>
    <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{user.email}</Text>
    <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{user.role}</Text>
    <View style={styles.actionButtons}>
      <Pressable
        style={[styles.editButton, { backgroundColor: colors.primary }]}
        onPress={() => onEdit(user.id)}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${user.first_name} ${user.last_name}`}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </Pressable>
      <Pressable
        style={[styles.deleteButton, { backgroundColor: colors.buttonDanger }]}
        onPress={() => onDelete(user.id)}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${user.first_name} ${user.last_name}`}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
    </View>
  </View>
  );
});

// QueryClientProvider is now mounted app-wide in App.tsx.
export default DatabaseInterfaceScreen;
