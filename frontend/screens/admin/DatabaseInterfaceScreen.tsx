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
import ThemedModal from '../../components/ui/Modal';
import { Button } from '../../components/ui';
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigation } from '@react-navigation/native';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
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

type TabType = 'users' | 'instructors' | 'students' | 'bookings' | 'reviews' | 'schedules';
type DeletableTab = 'users' | 'instructors' | 'students' | 'bookings';

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
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const platformDetection = useWindowsDetection();
  const isDeletableTab = (tab: TabType): tab is DeletableTab => tab !== 'reviews' && tab !== 'schedules';
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Column definitions for each table
  const getColumnDefinitions = (tab: TabType) => {
    const columnDefs: Record<TabType, Array<{ key: string; label: string }>> = {
      users: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created At' },
      ],
      instructors: [
        { key: 'id', label: 'ID' },
        { key: 'user_id', label: 'User ID' },
        { key: 'name', label: 'Name' },
        { key: 'license', label: 'License' },
        { key: 'vehicle', label: 'Vehicle' },
        { key: 'city', label: 'City' },
        { key: 'is_verified', label: 'Verified' },
        { key: 'rating', label: 'Rating' },
      ],
      students: [
        { key: 'id', label: 'ID' },
        { key: 'user_id', label: 'User ID' },
        { key: 'name', label: 'Name' },
        { key: 'id_number', label: 'ID Number' },
        { key: 'city', label: 'City' },
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
      ],
      reviews: [
        { key: 'id', label: 'ID' },
        { key: 'student_id', label: 'Student ID' },
        { key: 'instructor_id', label: 'Instructor ID' },
        { key: 'booking_id', label: 'Booking ID' },
        { key: 'rating', label: 'Rating' },
        { key: 'comment', label: 'Comment' },
        { key: 'created_at', label: 'Created At' },
      ],
      schedules: [
        { key: 'id', label: 'ID' },
        { key: 'instructor_id', label: 'Instructor ID' },
        { key: 'day_of_week', label: 'Day of Week' },
        { key: 'start_time', label: 'Start Time' },
        { key: 'end_time', label: 'End Time' },
        { key: 'is_available', label: 'Available' },
      ],
    };
    return columnDefs[tab];
  };

  // Tab & UI state
  const [activeTab, setActiveTab] = useState<TabType>('users');
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

  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL');
  const [instructorVerifiedFilter, setInstructorVerifiedFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'>('ALL');
  const [bookingStartDate, setBookingStartDate] = useState<string>('');
  const [bookingEndDate, setBookingEndDate] = useState<string>('');

  // Phase 4.1: Column visibility (persisted to localStorage)
  const [visibleColumns, setVisibleColumns] = useState<{
    users: string[];
    instructors: string[];
    students: string[];
    bookings: string[];
  }>({
    users: ['id', 'name', 'email', 'role', 'status', 'created_at', 'actions'],
    instructors: ['id', 'name', 'email', 'verified', 'license', 'vehicle', 'rating', 'actions'],
    students: ['id', 'name', 'email', 'phone', 'created_at', 'actions'],
    bookings: ['id', 'student', 'instructor', 'date', 'time', 'status', 'payment', 'actions'],
  });

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
    } else if (table === 'instructors') {
      setInstructorsTable((prev) => ({ ...prev, search: text }));
    } else if (table === 'students') {
      setStudentsTable((prev) => ({ ...prev, search: text }));
    } else if (table === 'bookings') {
      setBookingsTable((prev) => ({ ...prev, search: text }));
    }

    // Debounce the actual API call
    searchDebounceTimer.current = setTimeout(() => {
      switch (table) {
        case 'users':
          fetchUsers(1);
          break;
        case 'instructors':
          fetchInstructors(1);
          break;
        case 'students':
          fetchStudents(1);
          break;
        case 'bookings':
          fetchBookings(1);
          break;
      }
    }, 300);
  }, []);

  // Similar for students, bookings, reviews, schedules...

  // Fetch users
  const fetchUsers = async (page = 1) => {
    setUsersTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseUsers(
        page,
        usersTable.pageSize,
        usersTable.search,
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

  // Fetch instructors
  const fetchInstructors = async (page = 1) => {
    setInstructorsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const verifiedFilter = instructorVerifiedFilter === 'ALL'
        ? undefined
        : instructorVerifiedFilter === 'VERIFIED';
      const response = await getDatabaseInstructors(
        page,
        instructorsTable.pageSize,
        instructorsTable.search,
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

  const fetchStudents = async (page = 1) => {
    setStudentsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseStudents(page, studentsTable.pageSize, studentsTable.search);
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

  const fetchBookings = async (page = 1) => {
    setBookingsTable((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getDatabaseBookings(
        page,
        bookingsTable.pageSize,
        bookingsTable.search,
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

  // Open edit modal with ETag
  const openEditModal = async (recordId: number) => {
    try {
      let detail;
      switch (activeTab) {
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
      switch (activeTab) {
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
    switch (activeTab) {
      case 'users':
        fetchUsers(usersTable.page);
        break;
      case 'instructors':
        fetchInstructors(instructorsTable.page);
        break;
      case 'students':
        fetchStudents(studentsTable.page);
        break;
      case 'bookings':
        fetchBookings(bookingsTable.page);
        break;
    }
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

    switch (activeTab) {
      case 'users':
        fetchUsers(usersTable.page);
        break;
      case 'instructors':
        fetchInstructors(instructorsTable.page);
        break;
      case 'students':
        fetchStudents(studentsTable.page);
        break;
      case 'bookings':
        fetchBookings(bookingsTable.page);
        break;
    }
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
                        activeTab === 'instructors' ? instructorsTable :
                        activeTab === 'students' ? studentsTable : bookingsTable;
    
    const setTable = activeTab === 'users' ? setUsersTable :
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
        case 'instructors': fetchInstructors(1); break;
        case 'students': fetchStudents(1); break;
        case 'bookings': fetchBookings(1); break;
      }
    }, 100);
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    const currentSort = activeTab === 'users' ? usersTable.sort :
                       activeTab === 'instructors' ? instructorsTable.sort :
                       activeTab === 'students' ? studentsTable.sort : bookingsTable.sort;
    
    if (currentSort === column) return ' ▲';
    if (currentSort === `-${column}`) return ' ▼';
    return ' ↕';
  };

  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns((prev) => {
      const currentColumns = prev[activeTab];
      const newColumns = currentColumns.includes(column)
        ? currentColumns.filter((col) => col !== column)
        : [...currentColumns, column];
      
      const updated = { ...prev, [activeTab]: newColumns };
      
      // Persist to localStorage
      if (Platform.OS === 'web') {
        localStorage.setItem('dbInterfaceColumns', JSON.stringify(updated));
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
    const currentData = activeTab === 'users' ? usersTable.data :
                       activeTab === 'instructors' ? instructorsTable.data :
                       activeTab === 'students' ? studentsTable.data : bookingsTable.data;
    
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
      
      if (activeTab === 'users') {
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
        table: activeTab as 'users' | 'instructors' | 'students' | 'bookings',
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
      switch (activeTab) {
        case 'users':
          fetchUsers(usersTable.page);
          break;
        case 'instructors':
          fetchInstructors(instructorsTable.page);
          break;
        case 'bookings':
          fetchBookings(bookingsTable.page);
          break;
      }
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
    const currentData = activeTab === 'users' ? usersTable.data :
                       activeTab === 'instructors' ? instructorsTable.data :
                       activeTab === 'students' ? studentsTable.data : bookingsTable.data;
    
    if (currentData.length === 0) {
      setErrorMessage('No data to export');
      return;
    }

    // Get column headers
    const headers = Object.keys(currentData[0]);
    
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
    const currentData = activeTab === 'users' ? usersTable.data :
                       activeTab === 'instructors' ? instructorsTable.data :
                       activeTab === 'students' ? studentsTable.data : bookingsTable.data;
    
    if (currentData.length === 0) {
      setErrorMessage('No data to export');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(activeTab.toUpperCase());

      // Add metadata
      worksheet.addRow(['RoadReady Database Export']);
      worksheet.addRow(['Export Date:', new Date().toISOString()]);
      worksheet.addRow(['Table:', activeTab]);
      worksheet.addRow(['Total Records:', currentData.length]);
      worksheet.addRow([]);

      // Add headers
      const headers = Object.keys(currentData[0]);
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
  const exportToPDF = () => {
    const currentData = activeTab === 'users' ? usersTable.data :
                       activeTab === 'instructors' ? instructorsTable.data :
                       activeTab === 'students' ? studentsTable.data : bookingsTable.data;
    
    if (currentData.length === 0) {
      setErrorMessage('No data to export');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Add metadata
      doc.setFontSize(16);
      doc.text('RoadReady Database Export', 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Export Date: ${new Date().toISOString()}`, 14, 30);
      doc.text(`Table: ${activeTab}`, 14, 35);
      doc.text(`Total Records: ${currentData.length}`, 14, 40);

      // Add table data (simplified - first 5 columns only)
      const headers = Object.keys(currentData[0]).slice(0, 5);
      let yPosition = 50;

      // Headers
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      headers.forEach((header, index) => {
        doc.text(header, 14 + (index * 35), yPosition);
      });

      // Data rows
      doc.setFont(undefined, 'normal');
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
              if (activeTab === 'users') fetchUsers(1);
              else if (activeTab === 'instructors') fetchInstructors(1);
              else if (activeTab === 'students') fetchStudents(1);
              else if (activeTab === 'bookings') fetchBookings(1);
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
    const saved = localStorage.getItem('dbInterfaceColumns');
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load column preferences:', error);
      }
    }
  }, []);

  // Load data on tab change
  useEffect(() => {
    if (!platformDetection.isPlatformAllowed) return;

    switch (activeTab) {
      case 'users':
        fetchUsers();
        break;
      case 'instructors':
        fetchInstructors();
        break;
      case 'students':
        fetchStudents();
        break;
      case 'bookings':
        fetchBookings();
        break;
    }
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
        if (activeTab === 'users' && usersTable.page > 1) {
          fetchUsers(usersTable.page - 1);
        } else if (activeTab === 'instructors' && instructorsTable.page > 1) {
          fetchInstructors(instructorsTable.page - 1);
        } else if (activeTab === 'students' && studentsTable.page > 1) {
          fetchStudents(studentsTable.page - 1);
        } else if (activeTab === 'bookings' && bookingsTable.page > 1) {
          fetchBookings(bookingsTable.page - 1);
        }
      }
      // Page Down - Next page
      else if (event.key === 'PageDown') {
        event.preventDefault();
        if (activeTab === 'users' && usersTable.page < usersTable.totalPages) {
          fetchUsers(usersTable.page + 1);
        } else if (activeTab === 'instructors' && instructorsTable.page < instructorsTable.totalPages) {
          fetchInstructors(instructorsTable.page + 1);
        } else if (activeTab === 'students' && studentsTable.page < studentsTable.totalPages) {
          fetchStudents(studentsTable.page + 1);
        } else if (activeTab === 'bookings' && bookingsTable.page < bookingsTable.totalPages) {
          fetchBookings(bookingsTable.page + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, usersTable.page, usersTable.totalPages, instructorsTable.page, instructorsTable.totalPages, studentsTable.page, studentsTable.totalPages, bookingsTable.page, bookingsTable.totalPages]);

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

        {/* Main Admin Protection Info (Users tab only) */}
        {activeTab === 'users' && (
          <View style={[styles.infoMessage, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>
              The original admin account (ID: 1) cannot be suspended. 
              You can still delete Student/Instructor profiles but the Admin role is protected.
            </Text>
          </View>
        )}

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabNavigation, { borderBottomColor: colors.border }]}>
          {(['users', 'instructors', 'students', 'bookings', 'reviews', 'schedules'] as TabType[]).map((tab) => (
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
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Search..."
            placeholderTextColor={colors.inputPlaceholder}
            accessibilityLabel="Search database records"
            accessibilityHint="Type to search and results will update after 300ms"
            value={activeTab === 'users' ? usersTable.search :
              activeTab === 'instructors' ? instructorsTable.search :
              activeTab === 'students' ? studentsTable.search :
              activeTab === 'bookings' ? bookingsTable.search : ''}
            onChangeText={(text) => handleSearchChange(text, activeTab)}
          />

          {activeTab === 'users' && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Role</Text>
              <View style={styles.filterChips}>
                {(['ALL', 'ADMIN', 'INSTRUCTOR', 'STUDENT'] as const).map((role) => (
                  <Pressable
                    key={role}
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, userRoleFilter === role && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
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
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, userStatusFilter === status && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
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
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, instructorVerifiedFilter === status && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
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
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, bookingStatusFilter === status && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
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
                    style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, bookingPaymentFilter === status && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
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
              style={[styles.exportButton, { backgroundColor: colors.danger }]}
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
                style={[styles.clearSelectionButton, { backgroundColor: colors.danger }]}
                onPress={clearAllSelections}
              >
                <Text style={styles.clearSelectionText}>Clear</Text>
              </Pressable>
            </View>
          )}

          {/* Select All Button */}
          {!getSelectedIds().length && (
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
        {(usersTable.loading || instructorsTable.loading || studentsTable.loading || bookingsTable.loading) && (
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
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#D97706', marginTop: 2 }}>PROTECTED ADMIN</Text>
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
                        { backgroundColor: colors.danger },
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
                    style={[styles.deleteButton, { backgroundColor: colors.danger }]}
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
                    style={[styles.deleteButton, { backgroundColor: colors.danger }]}
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
                      style={[styles.deleteButton, { backgroundColor: colors.danger }]}
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

        {/* Empty State */}
        {activeTab === 'users' && !usersTable.loading && usersTable.data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}></Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No users found</Text>
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

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          <Pressable
            disabled={
              (activeTab === 'users' && usersTable.page <= 1) ||
              (activeTab === 'instructors' && instructorsTable.page <= 1) ||
              (activeTab === 'students' && studentsTable.page <= 1) ||
              (activeTab === 'bookings' && bookingsTable.page <= 1)
            }
            onPress={() => {
              if (activeTab === 'users') fetchUsers(usersTable.page - 1);
              else if (activeTab === 'instructors') fetchInstructors(instructorsTable.page - 1);
              else if (activeTab === 'students') fetchStudents(studentsTable.page - 1);
              else if (activeTab === 'bookings') fetchBookings(bookingsTable.page - 1);
            }}
            style={[
              styles.paginationButton,
              { backgroundColor: colors.primary },
              ((activeTab === 'users' && usersTable.page <= 1) ||
               (activeTab === 'instructors' && instructorsTable.page <= 1) ||
               (activeTab === 'students' && studentsTable.page <= 1) ||
               (activeTab === 'bookings' && bookingsTable.page <= 1)) && { backgroundColor: colors.border }
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to previous page"
          >
            <Text style={styles.paginationButtonText}>◀ Previous</Text>
          </Pressable>

          <Text style={[styles.paginationInfo, { color: colors.textSecondary }]}>
            Page {activeTab === 'users' ? usersTable.page : activeTab === 'instructors' ? instructorsTable.page : activeTab === 'bookings' ? bookingsTable.page : studentsTable.page} of {activeTab === 'users' ? usersTable.totalPages : activeTab === 'instructors' ? instructorsTable.totalPages : activeTab === 'bookings' ? bookingsTable.totalPages : studentsTable.totalPages}
          </Text>

          <Pressable
            disabled={
              (activeTab === 'users' && usersTable.page >= usersTable.totalPages) ||
              (activeTab === 'instructors' && instructorsTable.page >= instructorsTable.totalPages) ||
              (activeTab === 'students' && studentsTable.page >= studentsTable.totalPages) ||
              (activeTab === 'bookings' && bookingsTable.page >= bookingsTable.totalPages)
            }
            onPress={() => {
              if (activeTab === 'users') fetchUsers(usersTable.page + 1);
              else if (activeTab === 'instructors') fetchInstructors(instructorsTable.page + 1);
              else if (activeTab === 'students') fetchStudents(studentsTable.page + 1);
              else if (activeTab === 'bookings') fetchBookings(bookingsTable.page + 1);
            }}
            style={[
              styles.paginationButton,
              { backgroundColor: colors.primary },
              ((activeTab === 'users' && usersTable.page >= usersTable.totalPages) ||
               (activeTab === 'instructors' && instructorsTable.page >= instructorsTable.totalPages) ||
               (activeTab === 'students' && studentsTable.page >= studentsTable.totalPages) ||
               (activeTab === 'bookings' && bookingsTable.page >= bookingsTable.totalPages)) && { backgroundColor: colors.border }
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to next page"
          >
            <Text style={styles.paginationButtonText}>Next ▶</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Form Modal */}
      {selectedRecord && (
        <DatabaseEditForm
          visible={showEditModal}
          tableType={activeTab}
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
              accessibilityState={{ checked: visibleColumns[column.key] }}
            >
              <View style={styles.columnCheckboxRow}>
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.primary },
                  visibleColumns[column.key] && { backgroundColor: colors.primary }
                ]}>
                  {visibleColumns[column.key] && (
                    <Text style={styles.checkboxIcon}>✓</Text>
                  )}
                </View>
                <Text style={[styles.columnCheckboxLabel, { color: colors.text }]}>{column.label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedModal>

      {selectedDeleteRecord && isDeletableTab(activeTab) && (
        <DatabaseDeleteConfirm
          visible={showDeleteModal}
          tableType={activeTab}
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
    fontSize: 14,
    marginLeft: 4,
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
    marginRight: 8,
  },
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
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
    marginTop: 12,
  },
  bulkActionsText: {
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  bulkActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
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
    marginLeft: 8,
  },
  columnToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
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
        style={[styles.deleteButton, { backgroundColor: colors.danger }]}
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

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

// Wrapper component with QueryClientProvider
const DatabaseInterfaceScreenWithQuery = (props: any) => (
  <QueryClientProvider client={queryClient}>
    <DatabaseInterfaceScreen {...props} />
  </QueryClientProvider>
);

export default DatabaseInterfaceScreenWithQuery;
