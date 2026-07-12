import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { computeTotals, formatCents } from '@/lib/money';
import { formatDateFr } from '@/lib/labels';
import type { DocumentLineRow, DocumentRow, SettingsRow } from '@/lib/types';

const s = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 64,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FAF9F6',
    color: '#111111',
  },
  headerTitle: { textAlign: 'right', fontSize: 34, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  headerNumero: { textAlign: 'right', fontSize: 13, marginTop: 2, color: '#333333' },
  parties: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  senderName: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  senderLine: { marginBottom: 2, color: '#333333' },
  clientBlock: { textAlign: 'right' },
  clientLine: { marginBottom: 2, color: '#333333' },
  sectionTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 36, marginBottom: 8 },
  ruleHeavy: { borderBottomWidth: 1, borderColor: '#111111' },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderColor: '#CCCCCC',
    paddingVertical: 9,
  },
  lineDetail: { color: '#777777', fontSize: 9, marginTop: 2 },
  lineAmount: { fontFamily: 'Helvetica-Bold' },
  totals: { marginTop: 18, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  totalLabel: { fontFamily: 'Helvetica-Bold', marginRight: 16 },
  totalValue: { fontFamily: 'Helvetica-Bold', width: 90, textAlign: 'right' },
  grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginRight: 16 },
  grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, width: 90, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 64,
    right: 64,
  },
  footerRule: { borderBottomWidth: 1, borderColor: '#111111', marginBottom: 12 },
  footerCols: { flexDirection: 'row', justifyContent: 'space-between' },
  footerCol: { maxWidth: '46%' },
  footerColRight: { maxWidth: '46%', textAlign: 'right' },
  footerTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  footerLine: { marginBottom: 2, color: '#333333' },
  footerCenter: { textAlign: 'center', marginTop: 14, color: '#777777', fontSize: 9 },
});

export function DocumentPdf({ doc, lines, settings }: {
  doc: DocumentRow; lines: DocumentLineRow[]; settings: SettingsRow;
}) {
  const totals = computeTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
    doc.vat_na ? 0 : Number(doc.vat_rate));
  const c = doc.client_snapshot;
  const clientName = c.company || [c.first_name, c.last_name].filter(Boolean).join(' ');

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.headerTitle}>{doc.type === 'facture' ? 'FACTURE' : 'DEVIS'}</Text>
        <Text style={s.headerNumero}>
          {doc.numero ? `#${doc.numero}` : `du ${formatDateFr(doc.issue_date)}`}
        </Text>

        <View style={s.parties}>
          <View>
            <Text style={s.senderName}>{settings.company_name}</Text>
            {settings.company_id ? <Text style={s.senderLine}>{settings.company_id}</Text> : null}
            {settings.address ? <Text style={s.senderLine}>{settings.address}</Text> : null}
            <Text style={s.senderLine}>{[settings.postal_code, settings.city].filter(Boolean).join(' ')}</Text>
            {settings.country ? <Text style={s.senderLine}>{settings.country}</Text> : null}
          </View>
          <View style={s.clientBlock}>
            <Text style={s.clientLine}>Date d'émission : {formatDateFr(doc.issue_date)}</Text>
            <Text style={s.clientLine}>
              Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ? formatDateFr(doc.due_date) : '—')}
            </Text>
            {clientName ? <Text style={s.clientLine}>{clientName}</Text> : null}
            {c.company_id ? <Text style={s.clientLine}>Numéro Siret : {c.company_id}</Text> : null}
            {c.address ? <Text style={s.clientLine}>{c.address}</Text> : null}
            <Text style={s.clientLine}>{[c.postal_code, c.city].filter(Boolean).join(' ')}</Text>
            {c.country ? <Text style={s.clientLine}>{c.country}</Text> : null}
          </View>
        </View>

        <Text style={s.sectionTitle}>Description</Text>
        <View style={s.ruleHeavy} />
        {lines.map((l) => (
          <View key={l.id} style={s.lineRow}>
            <View>
              <Text>{l.label}</Text>
              {Number(l.quantity) !== 1 ? (
                <Text style={s.lineDetail}>
                  {String(l.quantity)} × {formatCents(l.unit_price_cents, doc.currency)}
                </Text>
              ) : null}
            </View>
            <Text style={s.lineAmount}>
              {formatCents(Math.round(Number(l.quantity) * l.unit_price_cents), doc.currency)}
            </Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Sous total :</Text>
            <Text style={s.totalValue}>{formatCents(totals.totalHTCents, doc.currency)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TVA ({doc.vat_na ? 0 : doc.vat_rate}%) :</Text>
            <Text style={s.totalValue}>{formatCents(totals.totalTVACents, doc.currency)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.grandLabel}>TOTAL :</Text>
            <Text style={s.grandValue}>{formatCents(totals.totalTTCCents, doc.currency)}</Text>
          </View>
        </View>

        <View style={s.footer}>
          <View style={s.footerRule} />
          <View style={s.footerCols}>
            <View style={s.footerCol}>
              <Text style={s.footerTitle}>Informations de paiement</Text>
              <Text style={s.footerLine}>{settings.company_name}</Text>
              {doc.payment_transfer && settings.iban ? (
                <Text style={s.footerLine}>IBAN : {settings.iban}</Text>
              ) : null}
              {doc.payment_transfer && settings.bic ? (
                <Text style={s.footerLine}>BIC : {settings.bic}</Text>
              ) : null}
              {doc.payment_cheque ? <Text style={s.footerLine}>Chèque accepté</Text> : null}
            </View>
            <View style={s.footerColRight}>
              <Text style={s.footerTitle}>Conditions et termes</Text>
              <Text style={s.footerLine}>
                {doc.due_on_receipt
                  ? 'Paiement à réception'
                  : doc.due_date
                    ? `Paiement avant le ${formatDateFr(doc.due_date)}`
                    : 'Paiement à convenir'}
              </Text>
              {doc.vat_na ? <Text style={s.footerLine}>TVA non applicable</Text> : null}
              {doc.type === 'facture' && settings.late_penalty_enabled ? (
                <Text style={s.footerLine}>Pénalités légales applicables si retard de paiement</Text>
              ) : null}
            </View>
          </View>
          {doc.footer || settings.footer_default ? (
            <Text style={s.footerCenter}>{doc.footer || settings.footer_default}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
