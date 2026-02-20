import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import "@/lib/pdf-fonts";
import { formatKRW } from "@/lib/settlement-utils";

export type SettlementDocumentProps = {
  year: number;
  month: number;
  starName: string;
  phone?: string | null;
  email?: string | null;
  idNumber?: string | null; // Already masked
  paymentDate?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  companyName: string;
  items: Array<{
    description: string;
    preTaxAmount: number;
    taxAmount: number;
    netAmount: number;
  }>;
  totalPreTax: number;
  totalTax: number;
  totalNet: number;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansKR",
    padding: 30,
    fontSize: 10,
    flexDirection: "column",
  },
  // Header
  header: {
    backgroundColor: "#007A8C",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 700,
  },
  headerCompany: {
    color: "#FFFFFF",
    fontSize: 10,
    opacity: 0.9,
  },
  // Info Section
  infoSection: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 20,
  },
  infoColumn: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 60,
    color: "#4B5563",
    fontWeight: 700,
  },
  infoValue: {
    flex: 1,
    color: "#000000",
  },
  // Table
  table: {
    flexDirection: "column",
    marginBottom: 20,
    flexGrow: 1,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  colItem: { flex: 4, textAlign: "left" },
  colAmount: { flex: 2, textAlign: "right" },
  colTax: { flex: 2, textAlign: "right" },
  colNet: { flex: 2, textAlign: "right" },
  
  headerText: {
    fontWeight: 700,
    fontSize: 10,
  },
  rowText: {
    fontSize: 10,
  },
  
  // Summary
  summary: {
    flexDirection: "row",
    height: 80,
    marginTop: "auto", // Push to bottom if needed, or just after table
  },
  summaryLeft: {
    flex: 4,
    backgroundColor: "#E6F2F5",
    padding: 15,
  },
  summaryRight: {
    flex: 6,
    backgroundColor: "#007A8C",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
    color: "#4B5563",
  },
  summaryText: {
    fontSize: 8,
    color: "#6B7280",
    lineHeight: 1.4,
  },
  totalColumn: {
    alignItems: "flex-end",
  },
  totalLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    marginBottom: 4,
    opacity: 0.9,
  },
  totalValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 700,
  },
});

export function SettlementDocument({
  year,
  month,
  starName,
  phone,
  email,
  idNumber,
  paymentDate,
  bankName,
  bankAccount,
  companyName,
  items,
  totalPreTax,
  totalTax,
  totalNet,
}: SettlementDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {year}년 {month}월 지급 내역서
          </Text>
          <Text style={styles.headerCompany}>{companyName}</Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>프리랜서</Text>
              <Text style={styles.infoValue}>{starName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>전화번호</Text>
              <Text style={styles.infoValue}>{phone ?? ""}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>이메일</Text>
              <Text style={styles.infoValue}>{email ?? ""}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주민번호</Text>
              <Text style={styles.infoValue}>{idNumber ?? ""}</Text>
            </View>
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>지급일</Text>
              <Text style={styles.infoValue}>{paymentDate ?? ""}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>지급계좌</Text>
              <Text style={styles.infoValue}>
                {bankName && bankAccount ? `${bankName} ${bankAccount}` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colItem, styles.headerText]}>지급 항목</Text>
            <Text style={[styles.colAmount, styles.headerText]}>세전 금액</Text>
            <Text style={[styles.colTax, styles.headerText]}>세금 (3.3%)</Text>
            <Text style={[styles.colNet, styles.headerText]}>실지급액</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.colItem, styles.rowText]}>
                {item.description}
              </Text>
              <Text style={[styles.colAmount, styles.rowText]}>
                {formatKRW(item.preTaxAmount)}
              </Text>
              <Text style={[styles.colTax, styles.rowText]}>
                {formatKRW(item.taxAmount)}
              </Text>
              <Text style={[styles.colNet, styles.rowText]}>
                {formatKRW(item.netAmount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>참고사항</Text>
            <Text style={styles.summaryText}>
              • 본 지급 내역서는 소득세법에 따른 원천징수 내역을 포함합니다.{"\n"}
              • 문의사항이 있으신 경우 담당자에게 연락 바랍니다.
            </Text>
          </View>
          <View style={styles.summaryRight}>
            <View style={styles.totalColumn}>
              <Text style={styles.totalLabel}>지급 총액</Text>
              <Text style={styles.totalValue}>{formatKRW(totalPreTax)}</Text>
            </View>
            <View style={styles.totalColumn}>
              <Text style={styles.totalLabel}>세금</Text>
              <Text style={styles.totalValue}>{formatKRW(totalTax)}</Text>
            </View>
            <View style={styles.totalColumn}>
              <Text style={styles.totalLabel}>실지급액 합계</Text>
              <Text style={styles.totalValue}>{formatKRW(totalNet)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
