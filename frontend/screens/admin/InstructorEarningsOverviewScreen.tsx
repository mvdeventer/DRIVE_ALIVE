/**
 * Instructor Earnings Overview Screen (Admin)
 * Comprehensive view of all instructor earnings with detailed reports
 */
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, ThemedModal } from '../../components';
import InlineMessage from '../../components/InlineMessage';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import { useTheme } from '../../theme/ThemeContext';
import ApiService from '../../services/api';
import { showMessage } from '../../utils/messageConfig';

const SCREEN_NAME = 'InstructorEarningsOverviewScreen';

interface InstructorSummary {
  instructor_id: number;
  user_id: number;
  instructor_name: string;
  email: string;
  phone: string;
  total_earnings: number;
  completed_lessons: number;
  hourly_rate: number;
  is_verified: boolean;
  is_available: boolean;
  rating: number;
  total_reviews: number;
}

interface DetailedEarnings {
  instructor_id: number;
  instructor_name: string;
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
    duration_minutes: number;
    amount: number;
    status: string;
  }[];
}

export default function InstructorEarningsOverviewScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [instructors, setInstructors] = useState<InstructorSummary[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<DetailedEarnings | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/admin/instructors/earnings-summary');
      setInstructors(response.data.instructors);
    } catch (error: any) {
      console.error('Error loading instructors:', error);
      showMessage(
        setErrorMessage,
        `Failed to load instructors: ${error.response?.data?.detail || error.message}`,
        SCREEN_NAME,
        'error',
        'error'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetailedReport = async (instructorId: number) => {
    try {
      setLoadingDetail(true);
      const response = await ApiService.get(`/admin/instructors/${instructorId}/earnings-report`);
      setSelectedInstructor(response.data);
      setShowDetailModal(true);
    } catch (error: any) {
      console.error('Error loading detailed report:', error);
      showMessage(
        setErrorMessage,
        `Failed to load earnings report: ${error.response?.data?.detail || error.message}`,
        SCREEN_NAME,
        'error',
        'error'
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInstructors();
  };

  const exportToPDF = (instructor: DetailedEarnings) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text('Earnings Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Instructor Name
      doc.setFontSize(14);
      doc.text(instructor.instructor_name || 'N/A', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary Stats
      doc.setFontSize(12);
      doc.text(`Total Earnings: R${(instructor.total_earnings || 0).toFixed(2)}`, 20, yPos);
      yPos += 8;
      doc.text(`Hourly Rate: R${(instructor.hourly_rate || 0).toFixed(2)}`, 20, yPos);
      yPos += 8;
      doc.text(`Completed Lessons: ${instructor.completed_lessons || 0}`, 20, yPos);
      yPos += 8;
      doc.text(`Pending Lessons: ${instructor.pending_lessons || 0}`, 20, yPos);
      yPos += 8;
      doc.text(`Cancelled Lessons: ${instructor.cancelled_lessons || 0}`, 20, yPos);
      yPos += 8;
      doc.text(`Total Lessons: ${instructor.total_lessons || 0}`, 20, yPos);
      yPos += 15;

      // Monthly Earnings
      if (instructor.earnings_by_month && instructor.earnings_by_month.length > 0) {
        doc.setFontSize(14);
        doc.text('Monthly Breakdown', 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        instructor.earnings_by_month.forEach(month => {
          doc.text(
            `${month.month || 'N/A'}: R${(month.earnings || 0).toFixed(2)} (${
              month.lessons || 0
            } lessons)`,
            25,
            yPos
          );
          yPos += 6;
        });
        yPos += 10;
      }

      // Recent Earnings
      if (instructor.recent_earnings && instructor.recent_earnings.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Recent Earnings', 20, yPos);
        yPos += 10;
        doc.setFontSize(9);
        instructor.recent_earnings.forEach(earning => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(
            `${earning.student_name || 'N/A'} - ${formatDate(earning.lesson_date)} - R${(
              earning.amount || 0
            ).toFixed(2)}`,
            25,
            yPos
          );
          yPos += 6;
        });
      }

      doc.save(`${instructor.instructor_name || 'Instructor'}_Earnings_Report.pdf`);
      showMessage(
        setSuccessMessage,
        'PDF report downloaded successfully',
        SCREEN_NAME,
        'export',
        'success'
      );
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      showMessage(
        setErrorMessage,
        `Failed to export PDF: ${error.response?.data?.detail || error.message}`,
        SCREEN_NAME,
        'error',
        'error'
      );
    }
  };

  const exportToExcel = async (instructor: DetailedEarnings) => {
    try {
      const workbook = new ExcelJS.Workbook();

      // Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 },
      ];

      summarySheet.addRow({
        metric: 'Instructor Name',
        value: instructor.instructor_name || 'N/A',
      });
      summarySheet.addRow({
        metric: 'Total Earnings',
        value: `R${(instructor.total_earnings || 0).toFixed(2)}`,
      });
      summarySheet.addRow({
        metric: 'Hourly Rate',
        value: `R${(instructor.hourly_rate || 0).toFixed(2)}`,
      });
      summarySheet.addRow({
        metric: 'Completed Lessons',
        value: instructor.completed_lessons || 0,
      });
      summarySheet.addRow({ metric: 'Pending Lessons', value: instructor.pending_lessons || 0 });
      summarySheet.addRow({
        metric: 'Cancelled Lessons',
        value: instructor.cancelled_lessons || 0,
      });
      summarySheet.addRow({ metric: 'Total Lessons', value: instructor.total_lessons || 0 });

      // Monthly Breakdown Sheet
      if (instructor.earnings_by_month && instructor.earnings_by_month.length > 0) {
        const monthlySheet = workbook.addWorksheet('Monthly Breakdown');
        monthlySheet.columns = [
          { header: 'Month', key: 'month', width: 20 },
          { header: 'Earnings', key: 'earnings', width: 15 },
          { header: 'Lessons', key: 'lessons', width: 15 },
        ];
        instructor.earnings_by_month.forEach(month => {
          monthlySheet.addRow({
            month: month.month || 'N/A',
            earnings: `R${(month.earnings || 0).toFixed(2)}`,
            lessons: month.lessons || 0,
          });
        });
      }

      // Recent Earnings Sheet
      if (instructor.recent_earnings && instructor.recent_earnings.length > 0) {
        const recentSheet = workbook.addWorksheet('Recent Earnings');
        recentSheet.columns = [
          { header: 'Student Name', key: 'student', width: 25 },
          { header: 'Date', key: 'date', width: 20 },
          { header: 'Time', key: 'time', width: 15 },
          { header: 'Duration (min)', key: 'duration', width: 15 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
        ];
        instructor.recent_earnings.forEach(earning => {
          recentSheet.addRow({
            student: earning.student_name || 'N/A',
            date: formatDate(earning.lesson_date),
            time: formatTime(earning.lesson_date),
            duration: earning.duration_minutes || 0,
            amount: `R${(earning.amount || 0).toFixed(2)}`,
            status: earning.status || 'N/A',
          });
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${instructor.instructor_name || 'Instructor'}_Earnings_Report.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      showMessage(
        setSuccessMessage,
        'Excel report downloaded successfully',
        SCREEN_NAME,
        'export',
        'success'
      );
    } catch (error: any) {
      console.error('Error exporting Excel:', error);
      showMessage(
        setErrorMessage,
        `Failed to export Excel: ${error.response?.data?.detail || error.message}`,
        SCREEN_NAME,
        'error',
        'error'
      );
    }
  };

  const exportAllInstructorsReport = async () => {
    try {
      setLoading(true);
      showMessage(
        setSuccessMessage,
        'Fetching detailed reports for all instructors...',
        SCREEN_NAME,
        'export',
        'success'
      );

      // Fetch detailed reports for all instructors
      const detailedReports = await Promise.all(
        instructors.map(async instructor => {
          try {
            const response = await ApiService.get(
              `/admin/instructors/${instructor.instructor_id}/earnings-report`
            );
            return response.data;
          } catch (error) {
            console.error(`Error fetching report for ${instructor.instructor_name}:`, error);
            return null;
          }
        })
      );

      const validReports = detailedReports.filter(report => report !== null);

      console.log('Valid reports:', validReports.length);
      console.log('Sample report:', validReports[0]);
      console.log('Recent earnings sample:', validReports[0]?.recent_earnings);

      if (validReports.length === 0) {
        showMessage(
          setErrorMessage,
          'No instructor reports available to export',
          SCREEN_NAME,
          'error',
          'error'
        );
        return;
      }

      // Export to both PDF and Excel
      await exportAllToPDF(validReports);
      await exportAllToExcel(validReports);

      showMessage(
        setSuccessMessage,
        `Exported ${validReports.length} instructor reports successfully`,
        SCREEN_NAME,
        'export',
        'success'
      );
    } catch (error: any) {
      console.error('Error exporting all reports:', error);
      showMessage(
        setErrorMessage,
        `Failed to export reports: ${error.response?.data?.detail || error.message}`,
        SCREEN_NAME,
        'error',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const exportAllToPDF = async (allInstructors: DetailedEarnings[]) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      allInstructors.forEach((instructor, index) => {
        if (index > 0) doc.addPage();
        let yPos = 20;

        // Title
        doc.setFontSize(18);
        doc.text('Earnings Report', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Instructor Name
        doc.setFontSize(14);
        doc.text(instructor.instructor_name || 'N/A', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Summary Stats
        doc.setFontSize(12);
        doc.text(`Total Earnings: R${(instructor.total_earnings || 0).toFixed(2)}`, 20, yPos);
        yPos += 8;
        doc.text(`Hourly Rate: R${(instructor.hourly_rate || 0).toFixed(2)}`, 20, yPos);
        yPos += 8;
        doc.text(`Completed Lessons: ${instructor.completed_lessons || 0}`, 20, yPos);
        yPos += 8;
        doc.text(`Pending Lessons: ${instructor.pending_lessons || 0}`, 20, yPos);
        yPos += 8;
        doc.text(`Cancelled Lessons: ${instructor.cancelled_lessons || 0}`, 20, yPos);
        yPos += 8;
        doc.text(`Total Lessons: ${instructor.total_lessons || 0}`, 20, yPos);
        yPos += 15;

        // Monthly Earnings
        if (instructor.earnings_by_month && instructor.earnings_by_month.length > 0) {
          doc.setFontSize(14);
          doc.text('Monthly Breakdown', 20, yPos);
          yPos += 10;
          doc.setFontSize(10);
          instructor.earnings_by_month.forEach(month => {
            doc.text(
              `${month.month || 'N/A'}: R${(month.earnings || 0).toFixed(2)} (${
                month.lessons || 0
              } lessons)`,
              25,
              yPos
            );
            yPos += 6;
          });
          yPos += 10;
        }

        // Recent Earnings
        if (instructor.recent_earnings && instructor.recent_earnings.length > 0) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(14);
          doc.text('Recent Earnings', 20, yPos);
          yPos += 10;
          doc.setFontSize(9);
          instructor.recent_earnings.forEach(earning => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(
              `${earning.student_name || 'N/A'} - ${formatDate(earning.lesson_date)} - R${(
                earning.amount || 0
              ).toFixed(2)}`,
              25,
              yPos
            );
            yPos += 6;
          });
        }
      });

      doc.save('All_Instructors_Earnings_Report.pdf');
    } catch (error: any) {
      console.error('Error exporting all to PDF:', error);
      throw error;
    }
  };

  const exportAllToExcel = async (allInstructors: DetailedEarnings[]) => {
    try {
      const workbook = new ExcelJS.Workbook();

      // Summary Sheet for All Instructors
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Instructor Name', key: 'name', width: 30 },
        { header: 'Total Earnings', key: 'earnings', width: 20 },
        { header: 'Hourly Rate', key: 'rate', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Pending', key: 'pending', width: 15 },
        { header: 'Cancelled', key: 'cancelled', width: 15 },
        { header: 'Total Lessons', key: 'total', width: 15 },
      ];

      allInstructors.forEach(instructor => {
        summarySheet.addRow({
          name: instructor.instructor_name || 'N/A',
          earnings: `R${(instructor.total_earnings || 0).toFixed(2)}`,
          rate: `R${(instructor.hourly_rate || 0).toFixed(2)}`,
          completed: instructor.completed_lessons || 0,
          pending: instructor.pending_lessons || 0,
          cancelled: instructor.cancelled_lessons || 0,
          total: instructor.total_lessons || 0,
        });
      });

      // Enable filtering on Summary sheet
      summarySheet.autoFilter = {
        from: 'A1',
        to: 'G1',
      };

      // Detailed Breakdown Sheet
      const detailSheet = workbook.addWorksheet('Detailed Breakdown');
      detailSheet.columns = [
        { header: 'Instructor', key: 'instructor', width: 30 },
        { header: 'Month', key: 'month', width: 20 },
        { header: 'Earnings', key: 'earnings', width: 15 },
        { header: 'Lessons', key: 'lessons', width: 15 },
      ];

      allInstructors.forEach(instructor => {
        if (instructor.earnings_by_month && instructor.earnings_by_month.length > 0) {
          instructor.earnings_by_month.forEach(month => {
            detailSheet.addRow({
              instructor: instructor.instructor_name || 'N/A',
              month: month.month || 'N/A',
              earnings: `R${(month.earnings || 0).toFixed(2)}`,
              lessons: month.lessons || 0,
            });
          });
        }
      });

      // Enable filtering on Detailed Breakdown sheet
      detailSheet.autoFilter = {
        from: 'A1',
        to: 'D1',
      };

      // Detailed Student Bookings Sheet
      const bookingsSheet = workbook.addWorksheet('Detailed Student Bookings');
      bookingsSheet.columns = [
        { header: 'Instructor', key: 'instructor', width: 25 },
        { header: 'Student Name', key: 'student', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Suburb', key: 'suburb', width: 20 },
        { header: 'ID Number', key: 'id_number', width: 15 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Time', key: 'time', width: 15 },
        { header: 'Duration (min)', key: 'duration', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      console.log('📋 Creating Detailed Student Bookings sheet...');
      console.log(`Total instructors to process: ${allInstructors.length}`);

      let totalBookingsAdded = 0;
      allInstructors.forEach(instructor => {
        console.log(`\n👤 Processing: ${instructor.instructor_name}`);
        console.log(`   Completed lessons: ${instructor.completed_lessons}`);
        console.log(`   Recent earnings array exists: ${!!instructor.recent_earnings}`);
        console.log(`   Recent earnings length: ${instructor.recent_earnings?.length || 0}`);

        if (instructor.recent_earnings && instructor.recent_earnings.length > 0) {
          console.log(
            `   ✅ Adding ${instructor.recent_earnings.length} bookings for ${instructor.instructor_name}`
          );
          console.log(`   Sample booking:`, JSON.stringify(instructor.recent_earnings[0], null, 2));
          instructor.recent_earnings.forEach(earning => {
            bookingsSheet.addRow({
              instructor: instructor.instructor_name || 'N/A',
              student: earning.student_name || 'N/A',
              email: earning.student_email || 'N/A',
              phone: earning.student_phone || 'N/A',
              city: earning.student_city || 'N/A',
              suburb: earning.student_suburb || 'N/A',
              id_number: earning.student_id_number || 'N/A',
              date: formatDate(earning.lesson_date),
              time: formatTime(earning.lesson_date),
              duration: earning.duration_minutes || 0,
              amount: `R${(earning.amount || 0).toFixed(2)}`,
              status: earning.status || 'N/A',
            });
            totalBookingsAdded++;
          });
        } else {
          console.log(`   ⚠️  No recent earnings for ${instructor.instructor_name}`);
        }
      });

      console.log(`\n✅ Total bookings added to sheet: ${totalBookingsAdded}`);
      console.log(`📊 Summary sheet rows: ${allInstructors.length}`);

      // Enable filtering on Detailed Student Bookings sheet
      bookingsSheet.autoFilter = {
        from: 'A1',
        to: 'L1',
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'All_Instructors_Earnings_Report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting all to Excel:', error);
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

  const renderInstructorCard = ({ item }: { item: InstructorSummary }) => (
    <Card
      variant="elevated"
      style={{ margin: 10 }}
      onPress={() => loadDetailedReport(item.instructor_id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.instructorInfo}>
          <Text style={[styles.instructorName, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>{item.instructor_name}</Text>
          <View style={styles.badgeContainer}>
            {item.is_verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.success }]}>
                <Text style={[styles.badgeText, { fontFamily: 'Inter_600SemiBold' }]}>Verified</Text>
              </View>
            )}
            {item.is_available && (
              <View style={[styles.availableBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { fontFamily: 'Inter_600SemiBold' }]}>Available</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.totalEarnings, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{formatCurrency(item.total_earnings)}</Text>
      </View>

      <View style={[styles.cardStats, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Lessons</Text>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>{item.completed_lessons}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Hourly Rate</Text>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>{formatCurrency(item.hourly_rate)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Rating</Text>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>
            {item.rating.toFixed(1)} ({item.total_reviews})
          </Text>
        </View>
      </View>

      <Text style={[styles.viewDetailsLink, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>Tap to view detailed report</Text>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Loading instructor earnings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Instructor Earnings Overview"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      {successMessage ? <InlineMessage type="success" message={successMessage} /> : null}
      {errorMessage ? <InlineMessage type="error" message={errorMessage} /> : null}

      <FlatList
        data={instructors}
        renderItem={renderInstructorCard}
        keyExtractor={item => item.instructor_id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>Instructor Earnings Overview</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {instructors.length} instructor{instructors.length !== 1 ? 's' : ''} {'\u2022'} Total
                  Revenue:{' '}
                  {formatCurrency(instructors.reduce((sum, i) => sum + i.total_earnings, 0))}
                </Text>
              </View>
              {instructors.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  style={{ backgroundColor: colors.success }}
                  onPress={exportAllInstructorsReport}
                >
                  Export All
                </Button>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: 'Inter_400Regular' }]}>No instructors found</Text>
          </View>
        }
      />

      {/* Detailed Earnings Modal */}
      <ThemedModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedInstructor ? `Earnings Report: ${selectedInstructor.instructor_name}` : 'Earnings Report'}
        size="lg"
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {selectedInstructor && (
              <>
                <Button variant="primary" size="sm" onPress={() => exportToPDF(selectedInstructor)}>PDF</Button>
                <Button variant="primary" size="sm" onPress={() => exportToExcel(selectedInstructor)}>Excel</Button>
              </>
            )}
            <Button variant="secondary" onPress={() => setShowDetailModal(false)}>Close</Button>
          </View>
        }
      >
        {loadingDetail ? (
          <View style={styles.modalLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.modalLoadingText, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Loading detailed report...</Text>
          </View>
        ) : selectedInstructor ? (
          <ScrollView style={styles.modalScroll}>
            {/* Summary Cards */}
            <View style={styles.summarySection}>
              <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 2 }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total Earnings</Text>
                <Text style={[styles.summaryValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
                  {formatCurrency(selectedInstructor.total_earnings)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Completed</Text>
                <Text style={[styles.summaryValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>{selectedInstructor.completed_lessons}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Hourly Rate</Text>
                <Text style={[styles.summaryValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>
                  {formatCurrency(selectedInstructor.hourly_rate)}
                </Text>
              </View>
            </View>

            {/* Statistics */}
            <View style={styles.statsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Lesson Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statBadgeLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Completed</Text>
                  <Text style={[styles.statBadgeValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>
                    {selectedInstructor.completed_lessons}
                  </Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statBadgeLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Pending</Text>
                  <Text style={[styles.statBadgeValue, { color: colors.warning, fontFamily: 'Inter_700Bold' }]}>
                    {selectedInstructor.pending_lessons}
                  </Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statBadgeLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Cancelled</Text>
                  <Text style={[styles.statBadgeValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
                    {selectedInstructor.cancelled_lessons}
                  </Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.statBadgeLabel, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total</Text>
                  <Text style={[styles.statBadgeValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>{selectedInstructor.total_lessons}</Text>
                </View>
              </View>
            </View>

            {/* Monthly Breakdown */}
            {selectedInstructor.earnings_by_month.length > 0 && (
              <View style={styles.monthlySection}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Monthly Earnings</Text>
                {selectedInstructor.earnings_by_month.map((month, index) => (
                  <View key={index} style={[styles.monthCard, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.monthName, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>{month.month}</Text>
                    <View style={styles.monthStats}>
                      <Text style={[styles.monthEarnings, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{formatCurrency(month.earnings)}</Text>
                      <Text style={[styles.monthLessons, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>{month.lessons} lessons</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Earnings */}
            {selectedInstructor.recent_earnings.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>Recent Earnings</Text>
                {selectedInstructor.recent_earnings.map(earning => (
                  <View key={earning.id} style={[styles.earningCard, { backgroundColor: colors.backgroundSecondary }]}>
                    <View style={styles.earningHeader}>
                      <Text style={[styles.studentName, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>{earning.student_name}</Text>
                      <Text style={[styles.earningAmount, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{formatCurrency(earning.amount)}</Text>
                    </View>
                    <Text style={[styles.earningDate, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {formatDate(earning.lesson_date)} at {formatTime(earning.lesson_date)}
                    </Text>
                    <Text style={[styles.earningDuration, { color: colors.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      Duration: {earning.duration_minutes} minutes
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </ThemedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 18,
    marginBottom: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  availableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
  },
  totalEarnings: {
    fontSize: 22,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
  },
  viewDetailsLink: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalScroll: {
    padding: Platform.OS === 'web' ? 4 : 0,
  },
  summarySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 20,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 8,
    margin: 6,
    flexBasis: '30%',
    minWidth: 160,
    maxWidth: '48%',
    flexGrow: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statBadge: {
    padding: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 8,
    margin: Platform.OS === 'web' ? 5 : 4,
    flexBasis: Platform.OS === 'web' ? '22%' : '47%',
    minWidth: Platform.OS === 'web' ? 80 : 70,
    maxWidth: '100%',
    flexGrow: 1,
    alignItems: 'center',
  },
  statBadgeLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  statBadgeValue: {
    fontSize: 16,
  },
  monthlySection: {
    marginBottom: 20,
  },
  monthCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthName: {
    fontSize: 14,
  },
  monthStats: {
    alignItems: 'flex-end',
  },
  monthEarnings: {
    fontSize: 16,
  },
  monthLessons: {
    fontSize: 12,
  },
  recentSection: {
    marginBottom: 20,
  },
  earningCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  studentName: {
    fontSize: 14,
  },
  earningAmount: {
    fontSize: 16,
  },
  earningDate: {
    fontSize: 12,
    marginBottom: 3,
  },
  earningDuration: {
    fontSize: 12,
  },
});
