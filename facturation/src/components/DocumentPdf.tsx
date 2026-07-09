import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { computeTotals, formatCents } from '@/lib/money';
import type { DocumentLineRow, DocumentRow, SettingsRow } from '@/lib/types';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 20, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  block: { width: '45%' },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  table: { marginTop: 20 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#999', paddingVertical: 4 },
  cLabel: { width: '55%' }, cQty: { width: '15%', textAlign: 'right' },
  cPrice: { width: '15%', textAlign: 'right' }, cTotal: { width: '15%', textAlign: 'right' },
  totals: { marginTop: 10, alignSelf: 'flex-end', width: 180 },
  bold: { fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#666' },
  mention: { marginTop: 16, color: '#444' },
});

export function DocumentPdf({ doc, lines, settings }: {
  doc: DocumentRow; lines: DocumentLineRow[]; settings: SettingsRow;
}) {
  const totals = computeTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
    doc.vat_na ? 0 : Number(doc.vat_rate));
  const c = doc.client_snapshot;
  const label = doc.type === 'facture' ? 'Facture' : 'Devis';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{label} {doc.numero ?? '(brouillon)'}</Text>
        <View style={s.row}>
          <View style={s.block}>
            <Text style={s.h2}>{settings.company_name}</Text>
            {settings.company_id ? <Text>{settings.company_id}</Text> : null}
            <Text>{settings.address}</Text>
            <Text>{settings.postal_code} {settings.city}</Text>
            <Text>{settings.country}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.h2}>Client</Text>
            {c.company ? <Text>{c.company}</Text> : null}
            <Text>{[c.first_name, c.last_name].filter(Boolean).join(' ')}</Text>
            <Text>{c.address}</Text>
            <Text>{[c.postal_code, c.city].filter(Boolean).join(' ')}</Text>
            <Text>{c.country}</Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Text>Date d'émission : {doc.issue_date}</Text>
          <Text>
            Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ?? '—')}
          </Text>
        </View>

        <View style={s.table}>
          <View style={[s.tr, s.bold]}>
            <Text style={s.cLabel}>Désignation</Text>
            <Text style={s.cQty}>Qté</Text>
            <Text style={s.cPrice}>PU HT</Text>
            <Text style={s.cTotal}>Total HT</Text>
          </View>
          {lines.map((l) => (
            <View key={l.id} style={s.tr}>
              <Text style={s.cLabel}>{l.label}</Text>
              <Text style={s.cQty}>{String(l.quantity)}</Text>
              <Text style={s.cPrice}>{formatCents(l.unit_price_cents, doc.currency)}</Text>
              <Text style={s.cTotal}>
                {formatCents(Math.round(Number(l.quantity) * l.unit_price_cents), doc.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.row}><Text>Total HT</Text><Text>{formatCents(totals.totalHTCents, doc.currency)}</Text></View>
          <View style={s.row}><Text>Total TVA ({doc.vat_na ? 0 : doc.vat_rate}%)</Text><Text>{formatCents(totals.totalTVACents, doc.currency)}</Text></View>
          <View style={[s.row, s.bold]}><Text>Total TTC</Text><Text>{formatCents(totals.totalTTCCents, doc.currency)}</Text></View>
        </View>

        <View style={s.mention}>
          {doc.payment_transfer ? (
            <Text>Règlement par virement — IBAN : {settings.iban} — BIC : {settings.bic}</Text>
          ) : null}
          {doc.payment_cheque ? <Text>Règlement par chèque accepté</Text> : null}
          {doc.vat_na ? <Text>TVA non applicable</Text> : null}
          {doc.type === 'facture' && settings.late_penalty_enabled ? (
            <Text>Tout retard de paiement entraînera des pénalités de retard exigibles sans rappel.</Text>
          ) : null}
        </View>

        {doc.footer || settings.footer_default ? (
          <Text style={s.footer}>{doc.footer || settings.footer_default}</Text>
        ) : null}
      </Page>
    </Document>
  );
}
