/**
 * Detailed Earnings Report Screen for Instructors
 * Comprehensive earnings breakdown with filters and export functionality
 */
import { useFocusEffect } from '@react-navigation/native';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import ApiService from '../../services/api';
import { showMessage } from '../../utils/messageConfig';

interface EarningsData {
  total_earnings: number;
  hourly_rate: number;
  completed_lessons: number;
  pending_lessons: number;
  cancelled_lessons: number;
  total_lessons: number;
  earnings_by_month: { month: string; earnings: number; lessons: number }[];
  recent_earnings: {
    id: number;
    student_name: string;
    student_email?: string;
    student_phone?: string;
    student_city?: string;
    student_suburb?: string;
    student_id_number?: string;
    lesson_date: string;
    scheduled_time?: string;
    duration_minutes: number;
    amount: number;
    status: string;
    payment_status?: string;
    pickup_location?: string;
  }[];
}

interface InstructorProfile {
  instructor_id: number;
  first_name: string;
  last_name: string;
  hourly_rate: number;
  total_earnings: number;
}

export default function EarningsReportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [detailedBookings, setDetailedBookings] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, earningsRes, bookingsRes] = await Promise.all([
        ApiService.get('/instructors/me'),
        ApiService.get('/instructors/earnings-report'),
        ApiService.get('/bookings/my-bookings'),
      ]);

      setProfile(profileRes.data);
      setEarningsData(earningsRes.data);
      setDetailedBookings(bookingsRes.data || []);
    } catch (error: any) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Generate timestamp for filenames
  const getTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
  };

  const exportReport = async () => {
    if (Platform.OS !== 'web') {
      showMessage(
        setErrorMessage,
        'Export functionality is only available on web',
        'EarningsReportScreen',
        'exportNotAvailable',
        'error'
      );
      return;
    }

    showMessage(
      setSuccessMessage,
      'Generating PDF and Excel reports...',
      'EarningsReportScreen',
      'exportStart',
      'success'
    );

    try {
      // Export both PDF and Excel
      await exportToPDF();
      await exportToExcel();
      showMessage(
        setSuccessMessage,
        '✅ Reports exported successfully!\n\nPDF and Excel files have been downloaded.',
        'EarningsReportScreen',
        'exportSuccess',
        'success'
      );
    } catch (error) {
      console.error('Export error:', error);
      showMessage(
        setErrorMessage,
        '❌ Error exporting reports. Please try again.',
        'EarningsReportScreen',
        'exportError',
        'error'
      );
    }
  };

  const exportToPDF = () => {
    if (!profile || !earningsData) return;

    try {
      const doc = new jsPDF();
      let yPosition = 10;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text('EARNINGS REPORT', 105, yPosition, { align: 'center' });
      yPosition += 12;

      // Instructor Info Box
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(78, 205, 196);
      doc.setLineWidth(0.5);
      doc.rect(15, yPosition - 5, 180, 18);
      doc.text(`Instructor: ${profile.first_name} ${profile.last_name}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Report Date: ${new Date().toLocaleDateString('en-ZA')}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Hourly Rate: R${profile.hourly_rate.toFixed(2)}`, 20, yPosition);
      yPosition += 12;

      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Financial Summary', 15, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);

      // Summary table
      const summaryData = [
        ['Total Earnings', `R${earningsData.total_earnings.toFixed(2)}`],
        ['Completed Lessons', earningsData.completed_lessons.toString()],
        ['Pending Lessons', earningsData.pending_lessons.toString()],
        ['Cancelled Lessons', earningsData.cancelled_lessons.toString()],
        ['Total Lessons', earningsData.total_lessons.toString()],
        [
          'Avg per Lesson',
          `R${(earningsData.total_earnings / (earningsData.completed_lessons || 1)).toFixed(2)}`,
        ],
      ];

      summaryData.forEach(([label, value]) => {
        doc.text(label, 20, yPosition);
        doc.setFont(undefined, 'bold');
        doc.text(value, 120, yPosition);
        doc.setFont(undefined, 'normal');
        yPosition += 6;
      });

      yPosition += 8;

      // Monthly Breakdown
      if (earningsData.earnings_by_month && earningsData.earnings_by_month.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Monthly Breakdown', 15, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(78, 205, 196);
        doc.rect(15, yPosition - 5, 180, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('Month', 20, yPosition);
        doc.text('Earnings', 80, yPosition);
        doc.text('Lessons', 130, yPosition);
        doc.text('Avg/Lesson', 160, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        earningsData.earnings_by_month.forEach((month, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 15;
          }

          // Alternating row colors
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(15, yPosition - 4, 180, 6, 'F');
          }

          const avgPerLesson = month.lessons > 0 ? month.earnings / month.lessons : 0;
          doc.text(month.month, 20, yPosition);
          doc.text(`R${month.earnings.toFixed(2)}`, 80, yPosition);
          doc.text(month.lessons.toString(), 140, yPosition, { align: 'center' });
          doc.text(`R${avgPerLesson.toFixed(2)}`, 160, yPosition);
          yPosition += 6;
        });

        yPosition += 10;
      }

      // Student Details Section
      if (detailedBookings && detailedBookings.length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 15;
        }

        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('All Student Bookings', 15, yPosition);
        yPosition += 8;

        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(78, 205, 196);
        doc.rect(15, yPosition - 4, 180, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text('Student', 17, yPosition);
        doc.text('Date', 70, yPosition);
        doc.text('Time', 100, yPosition);
        doc.text('Dur', 120, yPosition);
        doc.text('Amount', 135, yPosition);
        doc.text('Status', 165, yPosition);
        yPosition += 6;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);

        // Show all bookings (limit to prevent overflow)
        const recentBookings = detailedBookings.slice(0, 25);
        recentBookings.forEach((booking, index) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 15;

            // Repeat header on new page
            doc.setFillColor(78, 205, 196);
            doc.rect(15, yPosition - 4, 180, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.text('Student', 17, yPosition);
            doc.text('Date', 70, yPosition);
            doc.text('Time', 100, yPosition);
            doc.text('Dur', 120, yPosition);
            doc.text('Amount', 135, yPosition);
            doc.text('Status', 165, yPosition);
            yPosition += 6;
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
          }

          // Alternating row colors
          if (index % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(15, yPosition - 3, 180, 5, 'F');
          }

          const studentName =
            booking.student_name.length > 20
              ? booking.student_name.substring(0, 18) + '...'
              : booking.student_name;

          const bookingDate = new Date(booking.scheduled_time);
          doc.text(studentName, 17, yPosition);
          doc.text(bookingDate.toLocaleDateString('en-ZA'), 70, yPosition);
          doc.text(
            bookingDate.toLocaleTimeString('en-ZA', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            100,
            yPosition
          );
          doc.text(`${booking.duration_minutes}m`, 120, yPosition);
          doc.text(`R${booking.total_price.toFixed(2)}`, 135, yPosition);

          // Color-coded status
          const status = booking.status;
          if (status === 'completed') {
            doc.setTextColor(21, 87, 36);
          } else if (status === 'cancelled') {
            doc.setTextColor(114, 28, 36);
          } else {
            doc.setTextColor(133, 100, 4);
          }
          doc.text(status.toUpperCase(), 165, yPosition);
          doc.setTextColor(0, 0, 0);

          yPosition += 5;
        });

        if (detailedBookings.length > 25) {
          yPosition += 3;
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Showing first 25 of ${earningsData.recent_earnings.length} bookings. See Excel for complete details.`,
            15,
            yPosition
          );
        }
      }

      // Footer
      yPosition = 285;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, 195, yPosition);
      yPosition += 5;
      doc.text('Drive Alive - Professional Driving School Management', 15, yPosition);
      doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, 195, yPosition, {
        align: 'right',
      });

      // Save PDF with timestamp
      doc.save(`Earnings_Report_${profile.first_name}_${profile.last_name}_${getTimestamp()}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  };

  const exportToExcel = async () => {
    if (!profile || !earningsData) return;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Drive Alive';
      workbook.created = new Date();

      // ===== Summary Sheet =====
      const summarySheet = workbook.addWorksheet('Summary', {
        properties: { tabColor: { argb: 'FF4ECDC4' } },
      });

      // Title
      summarySheet.mergeCells('A1:D1');
      summarySheet.getCell('A1').value = 'EARNINGS REPORT';
      summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF2C3E50' } };
      summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      summarySheet.getRow(1).height = 30;

      // Instructor Info
      summarySheet.getCell('A3').value = 'Instructor:';
      summarySheet.getCell('B3').value = `${profile.first_name} ${profile.last_name}`;
      summarySheet.getCell('A4').value = 'Report Date:';
      summarySheet.getCell('B4').value = new Date().toLocaleDateString('en-ZA');
      summarySheet.getCell('A3').font = { bold: true };
      summarySheet.getCell('A4').font = { bold: true };

      // Summary Section
      summarySheet.getCell('A6').value = 'SUMMARY';
      summarySheet.getCell('A6').font = { size: 14, bold: true, color: { argb: 'FF2C3E50' } };

      const summaryData = [
        ['Metric', 'Value'],
        ['Total Earnings', earningsData.total_earnings],
        ['Hourly Rate', profile.hourly_rate],
        ['Completed Lessons', earningsData.completed_lessons],
        ['Pending Lessons', earningsData.pending_lessons],
        ['Cancelled Lessons', earningsData.cancelled_lessons],
        ['Total Lessons', earningsData.total_lessons],
        [
          'Avg Earnings per Lesson',
          earningsData.completed_lessons > 0
            ? earningsData.total_earnings / earningsData.completed_lessons
            : 0,
        ],
      ];

      summarySheet.addTable({
        name: 'SummaryTable',
        ref: 'A7',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium2',
          showRowStripes: true,
        },
        columns: [
          { name: 'Metric', filterButton: false },
          { name: 'Value', filterButton: false },
        ],
        rows: summaryData
          .slice(1)
          .map(row => [
            row[0],
            (typeof row[1] === 'number' && row[0].includes('Earnings')) ||
            row[0].includes('Rate') ||
            row[0].includes('Avg')
              ? `R${row[1].toFixed(2)}`
              : row[1],
          ]),
      });

      summarySheet.getColumn('A').width = 25;
      summarySheet.getColumn('B').width = 20;

      // ===== Monthly Breakdown Sheet =====
      const monthlySheet = workbook.addWorksheet('Monthly Breakdown', {
        properties: { tabColor: { argb: 'FF45B7D1' } },
      });

      monthlySheet.getCell('A1').value = 'MONTHLY BREAKDOWN';
      monthlySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2C3E50' } };

      if (earningsData.earnings_by_month && earningsData.earnings_by_month.length > 0) {
        monthlySheet.addTable({
          name: 'MonthlyTable',
          ref: 'A3',
          headerRow: true,
          totalsRow: true,
          style: {
            theme: 'TableStyleMedium9',
            showRowStripes: true,
          },
          columns: [
            { name: 'Month', filterButton: true, totalsRowLabel: 'TOTAL:' },
            { name: 'Earnings (R)', filterButton: true, totalsRowFunction: 'sum' },
            { name: 'Lessons', filterButton: true, totalsRowFunction: 'sum' },
            { name: 'Avg per Lesson (R)', filterButton: true, totalsRowFunction: 'average' },
          ],
          rows: earningsData.earnings_by_month.map(month => [
            month.month,
            month.earnings,
            month.lessons,
            month.lessons > 0 ? month.earnings / month.lessons : 0,
          ]),
        });

        // Format currency columns
        const table = monthlySheet.getTable('MonthlyTable');
        const tableRange = table.table.tableRef;
        monthlySheet.getColumn('B').numFmt = 'R#,##0.00';
        monthlySheet.getColumn('D').numFmt = 'R#,##0.00';

        monthlySheet.getColumn('A').width = 18;
        monthlySheet.getColumn('B').width = 18;
        monthlySheet.getColumn('C').width = 12;
        monthlySheet.getColumn('D').width = 20;

        // ===== Detailed Student Bookings Sheet =====
        const studentsSheet = workbook.addWorksheet('Student Details', {
          properties: { tabColor: { argb: 'FFFF6B6B' } },
        });

        studentsSheet.getCell('A1').value = 'DETAILED STUDENT BOOKINGS';
        studentsSheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2C3E50' } };

        // Merge earnings data with detailed booking information
        if (detailedBookings && detailedBookings.length > 0) {
          const studentRows = detailedBookings.map(booking => {
            return [
              booking.student_name,
              booking.student_email || 'N/A',
              booking.student_phone || 'N/A',
              booking.student_city || 'N/A',
              booking.student_suburb || 'N/A',
              booking.student_id_number || 'N/A',
              new Date(booking.scheduled_time).toLocaleDateString('en-ZA'),
              new Date(booking.scheduled_time).toLocaleTimeString('en-ZA', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              booking.duration_minutes,
              booking.total_price,
              booking.status,
              booking.payment_status || 'N/A',
              booking.pickup_location || 'N/A',
            ];
          });

          studentsSheet.addTable({
            name: 'StudentBookingsTable',
            ref: 'A3',
            headerRow: true,
            totalsRow: true,
            style: {
              theme: 'TableStyleMedium15',
              showRowStripes: true,
            },
            columns: [
              { name: 'Student Name', filterButton: true },
              { name: 'Email', filterButton: true },
              { name: 'Phone', filterButton: true },
              { name: 'City', filterButton: true },
              { name: 'Suburb', filterButton: true },
              { name: 'ID Number', filterButton: true },
              { name: 'Date', filterButton: true },
              { name: 'Time', filterButton: true },
              { name: 'Duration (min)', filterButton: true, totalsRowFunction: 'sum' },
              { name: 'Booking Amount (R)', filterButton: true, totalsRowFunction: 'sum' },
              { name: 'Status', filterButton: true },
              { name: 'Payment Status', filterButton: true },
              { name: 'Pickup Location', filterButton: true },
            ],
            rows: studentRows,
          });

          // Format currency column
          studentsSheet.getColumn('J').numFmt = 'R#,##0.00';

          // Auto-size columns
          studentsSheet.getColumn('A').width = 20; // Student Name
          studentsSheet.getColumn('B').width = 25; // Email
          studentsSheet.getColumn('C').width = 15; // Phone
          studentsSheet.getColumn('D').width = 15; // City
          studentsSheet.getColumn('E').width = 15; // Suburb
          studentsSheet.getColumn('F').width = 15; // ID Number
          studentsSheet.getColumn('G').width = 12; // Date
          studentsSheet.getColumn('H').width = 10; // Time
          studentsSheet.getColumn('I').width = 15; // Duration
          studentsSheet.getColumn('J').width = 15; // Amount
          studentsSheet.getColumn('K').width = 12; // Status
          studentsSheet.getColumn('L').width = 15; // Payment Status
          studentsSheet.getColumn('M').width = 30; // Pickup Location

          // Add conditional formatting for status
          studentsSheet.getColumn('K').eachCell({ includeEmpty: false }, (cell, rowNumber) => {
            if (rowNumber > 3) {
              // Skip header and title
              const value = cell.value?.toString().toLowerCase();
              if (value === 'completed') {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFD4EDDA' }, // Light green
                };
                cell.font = { color: { argb: 'FF155724' }, bold: true };
              } else if (value === 'cancelled') {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF8D7DA' }, // Light red
                };
                cell.font = { color: { argb: 'FF721C24' }, bold: true };
              } else if (value === 'pending') {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFF3CD' }, // Light yellow
                };
                cell.font = { color: { argb: 'FF856404' }, bold: true };
              }
            }
          });
        }
      }

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `Earnings_Report_${profile.first_name}_${
        profile.last_name
      }_${getTimestamp()}.xlsx`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading earnings report...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Inline Messages */}
      {successMessage && (
        <InlineMessage
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          autoDismissMs={4000}
        />
      )}
      {errorMessage && (
        <InlineMessage
          type="error"
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
          autoDismissMs={5000}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Earnings Report</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportReport}>
          <Text style={styles.exportButtonText}>📥 Export</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.primaryCard]}>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(earningsData?.total_earnings || 0)}
            </Text>
            <Text style={styles.summarySubtext}>All time</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Hourly Rate</Text>
            <Text style={styles.summaryValue}>{formatCurrency(profile?.hourly_rate || 0)}</Text>
            <Text style={styles.summarySubtext}>per hour</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Completed Lessons</Text>
            <Text style={styles.summaryValue}>{earningsData?.completed_lessons || 0}</Text>
            <Text style={styles.summarySubtext}>paid lessons</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg. per Lesson</Text>
            <Text style={styles.summaryValue}>
              {earningsData?.completed_lessons
                ? formatCurrency(
                    (earningsData?.total_earnings || 0) / earningsData.completed_lessons
                  )
                : formatCurrency(0)}
            </Text>
            <Text style={styles.summarySubtext}>average</Text>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Lesson Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <View style={[styles.statDot, { backgroundColor: '#28a745' }]} />
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>{earningsData?.completed_lessons || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.statDot, { backgroundColor: '#ffc107' }]} />
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{earningsData?.pending_lessons || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.statDot, { backgroundColor: '#dc3545' }]} />
            <Text style={styles.statLabel}>Cancelled</Text>
            <Text style={styles.statValue}>{earningsData?.cancelled_lessons || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.statDot, { backgroundColor: '#007bff' }]} />
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{earningsData?.total_lessons || 0}</Text>
          </View>
        </View>
      </View>

      {/* Monthly Breakdown */}
      {earningsData?.earnings_by_month && earningsData.earnings_by_month.length > 0 && (
        <View style={styles.monthlySection}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          {earningsData.earnings_by_month.map((month, index) => (
            <View key={index} style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthName}>📅 {month.month}</Text>
                <Text style={styles.monthEarnings}>{formatCurrency(month.earnings)}</Text>
              </View>
              <View style={styles.monthDetails}>
                <Text style={styles.monthLessons}>{month.lessons} lessons completed</Text>
                <Text style={styles.monthAverage}>
                  Avg:{' '}
                  {month.lessons > 0
                    ? formatCurrency(month.earnings / month.lessons)
                    : formatCurrency(0)}{' '}
                  per lesson
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Earnings */}
      {earningsData?.recent_earnings && earningsData.recent_earnings.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Earnings</Text>
          {earningsData.recent_earnings.map((earning, index) => (
            <View key={earning.id} style={styles.earningCard}>
              <View style={styles.earningHeader}>
                <Text style={styles.earningStudent}>👤 {earning.student_name}</Text>
                <Text style={styles.earningAmount}>{formatCurrency(earning.amount)}</Text>
              </View>
              <View style={styles.earningDetails}>
                <Text style={styles.earningDate}>
                  📅 {formatDate(earning.lesson_date)} at {formatTime(earning.lesson_date)}
                </Text>
                <Text style={styles.earningDuration}>⏱️ {earning.duration_minutes} minutes</Text>
                <View
                  style={[
                    styles.earningStatus,
                    { backgroundColor: getStatusColor(earning.status) },
                  ]}
                >
                  <Text style={styles.earningStatusText}>{earning.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* No Data Message */}
      {(!earningsData?.recent_earnings || earningsData.recent_earnings.length === 0) && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>💰</Text>
          <Text style={styles.emptyStateTitle}>No Earnings Yet</Text>
          <Text style={styles.emptyStateText}>
            Start completing lessons to see your earnings here!
          </Text>
        </View>
      )}

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Pull down to refresh your latest earnings data
        </Text>
        <Text style={styles.footerSubtext}>Last updated: {new Date().toLocaleString('en-ZA')}</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return '#28a745';
    case 'pending':
      return '#ffc107';
    case 'confirmed':
      return '#007bff';
    case 'cancelled':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  exportButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summarySection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: Platform.OS === 'web' ? 'calc(50% - 6px)' : '48%',
    minWidth: 160,
    boxShadow: '0px 2px 4px #0000001A',
    elevation: 2,
  },
  primaryCard: {
    backgroundColor: '#007bff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#999',
  },
  statsSection: {
    padding: 20,
    paddingTop: 0,
  },
  statsGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 4px #0000001A',
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  monthlySection: {
    padding: 20,
    paddingTop: 0,
  },
  monthCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px #0000001A',
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  monthEarnings: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  monthDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  monthLessons: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  monthAverage: {
    fontSize: 14,
    color: '#999',
  },
  recentSection: {
    padding: 20,
    paddingTop: 0,
  },
  earningCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px #0000001A',
    elevation: 2,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningStudent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  earningDetails: {
    gap: 6,
  },
  earningDate: {
    fontSize: 14,
    color: '#666',
  },
  earningDuration: {
    fontSize: 14,
    color: '#666',
  },
  earningStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  earningStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingTop: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
