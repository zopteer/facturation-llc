import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { computeTotals, formatCents } from '@/lib/money';
import { documentName, formatDateFr } from '@/lib/labels';
import { getTemplate, type InvoiceTemplate } from '@/lib/templates';
import type { DocumentLineRow, DocumentRow, SettingsRow } from '@/lib/types';

interface LayoutProps {
  doc: DocumentRow;
  lines: DocumentLineRow[];
  settings: SettingsRow;
  t: InvoiceTemplate;
  totals: ReturnType<typeof computeTotals>;
}

function paymentLines(doc: DocumentRow, settings: SettingsRow): string[] {
  const out: string[] = [];
  if (doc.payment_transfer && settings.iban) out.push(`IBAN : ${settings.iban}`);
  if (doc.payment_transfer && settings.bic) out.push(`BIC : ${settings.bic}`);
  if (doc.payment_cheque) out.push('Chèque accepté');
  return out;
}

function conditionLines(doc: DocumentRow, settings: SettingsRow): string[] {
  const out: string[] = [];
  out.push(doc.due_on_receipt
    ? 'Paiement à réception'
    : doc.due_date ? `Paiement avant le ${formatDateFr(doc.due_date)}` : 'Paiement à convenir');
  if (doc.vat_na) out.push('TVA non applicable');
  if (doc.type === 'facture' && settings.late_penalty_enabled) {
    out.push('Pénalités légales applicables si retard de paiement');
  }
  return out;
}

function clientName(doc: DocumentRow): string {
  const c = doc.client_snapshot;
  return c.company || [c.first_name, c.last_name].filter(Boolean).join(' ');
}

const vatRate = (doc: DocumentRow) => (doc.vat_na ? 0 : doc.vat_rate);
const lineTotal = (doc: DocumentRow, l: DocumentLineRow) =>
  formatCents(Math.round(Number(l.quantity) * l.unit_price_cents), doc.currency);

/* ================================================================== */
/* MODERNE : grand titre à droite, tableau à bandeau                   */
/* ================================================================== */

function LayoutModerne({ doc, lines, settings, t, totals }: LayoutProps) {
  const c = doc.client_snapshot;
  const s = StyleSheet.create({
    page: { paddingVertical: 56, paddingHorizontal: 64, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: t.colors.page, color: t.colors.ink },
    headerTitle: { textAlign: 'right', fontSize: 34, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    headerNumero: { textAlign: 'right', fontSize: 13, marginTop: 2, color: t.colors.muted },
    parties: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
    senderName: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
    line: { marginBottom: 2, color: t.colors.muted },
    clientBlock: { textAlign: 'right' },
    table: { marginTop: 36 },
    thead: { flexDirection: 'row', backgroundColor: t.colors.accent, color: t.colors.bandText, paddingVertical: 7, paddingHorizontal: 8, fontSize: 9 },
    tRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, fontFamily: 'Times-Italic', fontSize: 10.5, borderBottomWidth: 0.5, borderColor: '#DDDDDD' },
    cDesc: { width: '44%' }, cQty: { width: '10%', textAlign: 'center' }, cPU: { width: '18%', textAlign: 'center' },
    cTva: { width: '10%', textAlign: 'center' }, cTotal: { width: '18%', textAlign: 'right' },
    totals: { marginTop: 18, alignSelf: 'flex-end', width: 220 },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
    totalLabel: { fontFamily: 'Helvetica-Bold', marginRight: 16 },
    totalValue: { fontFamily: 'Helvetica-Bold', width: 90, textAlign: 'right' },
    grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginRight: 16 },
    grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, width: 90, textAlign: 'right' },
    footer: { position: 'absolute', bottom: 48, left: 64, right: 64 },
    footerRule: { borderBottomWidth: 1, borderColor: t.colors.accent, marginBottom: 12 },
    footerCols: { flexDirection: 'row', justifyContent: 'space-between' },
    footerCol: { maxWidth: '46%' },
    footerColRight: { maxWidth: '46%', textAlign: 'right' },
    footerTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
    footerLine: { marginBottom: 2, color: t.colors.muted },
    footerCenter: { textAlign: 'center', marginTop: 14, color: t.colors.muted, fontSize: 9 },
  });

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.headerTitle}>{doc.type === 'facture' ? 'FACTURE' : 'DEVIS'}</Text>
      <Text style={s.headerNumero}>{doc.numero ? `#${doc.numero}` : `du ${formatDateFr(doc.issue_date)}`}</Text>
      <View style={s.parties}>
        <View>
          <Text style={s.senderName}>{settings.company_name}</Text>
          {settings.company_id ? <Text style={s.line}>{settings.company_id}</Text> : null}
          {settings.address ? <Text style={s.line}>{settings.address}</Text> : null}
          <Text style={s.line}>{[settings.postal_code, settings.city].filter(Boolean).join(' ')}</Text>
          {settings.country ? <Text style={s.line}>{settings.country}</Text> : null}
        </View>
        <View style={s.clientBlock}>
          <Text style={s.line}>Date d'émission : {formatDateFr(doc.issue_date)}</Text>
          <Text style={s.line}>Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ? formatDateFr(doc.due_date) : '—')}</Text>
          {clientName(doc) ? <Text style={s.line}>{clientName(doc)}</Text> : null}
          {c.company_id ? <Text style={s.line}>Numéro Siret : {c.company_id}</Text> : null}
          {c.address ? <Text style={s.line}>{c.address}</Text> : null}
          <Text style={s.line}>{[c.postal_code, c.city].filter(Boolean).join(' ')}</Text>
          {c.country ? <Text style={s.line}>{c.country}</Text> : null}
        </View>
      </View>
      <View style={s.table}>
        <View style={s.thead}>
          <Text style={s.cDesc}>Description</Text><Text style={s.cQty}>Qté</Text>
          <Text style={s.cPU}>Prix unitaire</Text><Text style={s.cTva}>TVA (%)</Text><Text style={s.cTotal}>Total HT</Text>
        </View>
        {lines.map((l) => (
          <View key={l.id} style={s.tRow}>
            <Text style={s.cDesc}>{l.label}</Text><Text style={s.cQty}>{String(l.quantity)}</Text>
            <Text style={s.cPU}>{formatCents(l.unit_price_cents, doc.currency)}</Text>
            <Text style={s.cTva}>{String(vatRate(doc))}</Text><Text style={s.cTotal}>{lineTotal(doc, l)}</Text>
          </View>
        ))}
      </View>
      <View style={s.totals}>
        <View style={s.totalRow}><Text style={s.totalLabel}>Sous total :</Text><Text style={s.totalValue}>{formatCents(totals.totalHTCents, doc.currency)}</Text></View>
        <View style={s.totalRow}><Text style={s.totalLabel}>TVA ({vatRate(doc)}%) :</Text><Text style={s.totalValue}>{formatCents(totals.totalTVACents, doc.currency)}</Text></View>
        <View style={s.totalRow}><Text style={s.grandLabel}>TOTAL :</Text><Text style={s.grandValue}>{formatCents(totals.totalTTCCents, doc.currency)}</Text></View>
      </View>
      <View style={s.footer}>
        <View style={s.footerRule} />
        <View style={s.footerCols}>
          <View style={s.footerCol}>
            <Text style={s.footerTitle}>Informations de paiement</Text>
            <Text style={s.footerLine}>{settings.company_name}</Text>
            {paymentLines(doc, settings).map((line) => <Text key={line} style={s.footerLine}>{line}</Text>)}
          </View>
          <View style={s.footerColRight}>
            <Text style={s.footerTitle}>Conditions et termes</Text>
            {conditionLines(doc, settings).map((line) => <Text key={line} style={s.footerLine}>{line}</Text>)}
          </View>
        </View>
        {doc.footer || settings.footer_default ? <Text style={s.footerCenter}>{doc.footer || settings.footer_default}</Text> : null}
      </View>
    </Page>
  );
}

/* ================================================================== */
/* MINIMAL : centré, filets fins, sans bandeau                         */
/* ================================================================== */

function LayoutMinimal({ doc, lines, settings, t, totals }: LayoutProps) {
  const c = doc.client_snapshot;
  const s = StyleSheet.create({
    page: { paddingVertical: 64, paddingHorizontal: 72, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: t.colors.page, color: t.colors.ink },
    title: { textAlign: 'center', fontSize: 13, letterSpacing: 5, textTransform: 'uppercase' },
    numero: { textAlign: 'center', marginTop: 4, color: t.colors.muted },
    titleRule: { borderBottomWidth: 1, borderColor: t.colors.accent, width: 60, alignSelf: 'center', marginTop: 14, marginBottom: 28 },
    parties: { flexDirection: 'row', justifyContent: 'space-between' },
    partyTitle: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.5, color: t.colors.muted, marginBottom: 5 },
    strong: { fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    line: { marginBottom: 2, color: t.colors.muted },
    right: { textAlign: 'right' },
    dates: { marginTop: 18, textAlign: 'center', color: t.colors.muted },
    lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderColor: '#D8D4CC', paddingVertical: 10 },
    lineDetail: { color: t.colors.muted, fontSize: 9, marginTop: 2 },
    lineAmount: { fontFamily: 'Helvetica-Bold' },
    listTop: { marginTop: 30, borderTopWidth: 1, borderColor: t.colors.accent },
    totals: { marginTop: 16, alignSelf: 'flex-end', width: 200 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, color: t.colors.muted },
    grandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: t.colors.accent, paddingTop: 7, marginTop: 3 },
    grand: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: t.colors.ink },
    bottom: { position: 'absolute', bottom: 48, left: 72, right: 72, textAlign: 'center', color: t.colors.muted, fontSize: 9 },
    bottomLine: { marginBottom: 3 },
  });

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.title}>{doc.type === 'facture' ? 'Facture' : 'Devis'}</Text>
      <Text style={s.numero}>{doc.numero ? `Nº ${doc.numero}` : `du ${formatDateFr(doc.issue_date)}`}</Text>
      <View style={s.titleRule} />
      <View style={s.parties}>
        <View>
          <Text style={s.partyTitle}>Émetteur</Text>
          <Text style={s.strong}>{settings.company_name}</Text>
          {settings.company_id ? <Text style={s.line}>{settings.company_id}</Text> : null}
          {settings.address ? <Text style={s.line}>{settings.address}</Text> : null}
          <Text style={s.line}>{[settings.postal_code, settings.city, settings.country].filter(Boolean).join(' · ')}</Text>
        </View>
        <View style={s.right}>
          <Text style={s.partyTitle}>Client</Text>
          {clientName(doc) ? <Text style={s.strong}>{clientName(doc)}</Text> : null}
          {c.company_id ? <Text style={s.line}>{c.company_id}</Text> : null}
          {c.address ? <Text style={s.line}>{c.address}</Text> : null}
          <Text style={s.line}>{[c.postal_code, c.city, c.country].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <Text style={s.dates}>Émise le {formatDateFr(doc.issue_date)} — Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ? formatDateFr(doc.due_date) : '—')}</Text>
      <View style={s.listTop}>
        {lines.map((l) => (
          <View key={l.id} style={s.lineRow}>
            <View>
              <Text>{l.label}</Text>
              {Number(l.quantity) !== 1 ? <Text style={s.lineDetail}>{String(l.quantity)} × {formatCents(l.unit_price_cents, doc.currency)}</Text> : null}
            </View>
            <Text style={s.lineAmount}>{lineTotal(doc, l)}</Text>
          </View>
        ))}
      </View>
      <View style={s.totals}>
        <View style={s.totalRow}><Text>Total HT</Text><Text>{formatCents(totals.totalHTCents, doc.currency)}</Text></View>
        <View style={s.totalRow}><Text>TVA ({vatRate(doc)}%)</Text><Text>{formatCents(totals.totalTVACents, doc.currency)}</Text></View>
        <View style={s.grandRow}><Text style={s.grand}>Total TTC</Text><Text style={s.grand}>{formatCents(totals.totalTTCCents, doc.currency)}</Text></View>
      </View>
      <View style={s.bottom}>
        {paymentLines(doc, settings).length > 0 ? <Text style={s.bottomLine}>{paymentLines(doc, settings).join(' — ')}</Text> : null}
        <Text style={s.bottomLine}>{conditionLines(doc, settings).join(' — ')}</Text>
        {doc.footer || settings.footer_default ? <Text style={s.bottomLine}>{doc.footer || settings.footer_default}</Text> : null}
      </View>
    </Page>
  );
}

/* ================================================================== */
/* EN-TÊTE : bandeau de couleur pleine largeur en haut                 */
/* ================================================================== */

function LayoutBandeau({ doc, lines, settings, t, totals }: LayoutProps) {
  const c = doc.client_snapshot;
  const s = StyleSheet.create({
    page: { padding: 0, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: t.colors.page, color: t.colors.ink },
    band: { backgroundColor: t.colors.accent, color: t.colors.bandText, paddingVertical: 30, paddingHorizontal: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bandTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    bandNum: { marginTop: 3, fontSize: 11 },
    bandCompany: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
    body: { paddingHorizontal: 56, paddingTop: 26 },
    parties: { flexDirection: 'row', justifyContent: 'space-between' },
    partyTitle: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.5, color: t.colors.accent, marginBottom: 5, fontFamily: 'Helvetica-Bold' },
    strong: { fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    line: { marginBottom: 2, color: t.colors.muted },
    right: { textAlign: 'right' },
    table: { marginTop: 30 },
    thead: { flexDirection: 'row', borderBottomWidth: 1.5, borderColor: t.colors.accent, paddingBottom: 6, fontSize: 9, color: t.colors.accent, fontFamily: 'Helvetica-Bold' },
    tRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#DDDDDD' },
    cDesc: { width: '44%' }, cQty: { width: '10%', textAlign: 'center' }, cPU: { width: '18%', textAlign: 'center' },
    cTva: { width: '10%', textAlign: 'center' }, cTotal: { width: '18%', textAlign: 'right' },
    totals: { marginTop: 16, alignSelf: 'flex-end', width: 210 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, color: t.colors.muted },
    grandRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: t.colors.accent, color: t.colors.bandText, paddingVertical: 7, paddingHorizontal: 8, marginTop: 4 },
    grand: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
    mentions: { marginTop: 24, color: t.colors.muted },
    mention: { marginBottom: 2 },
    footerCenter: { position: 'absolute', bottom: 40, left: 56, right: 56, textAlign: 'center', color: t.colors.muted, fontSize: 9 },
  });

  return (
    <Page size="A4" style={s.page}>
      <View style={s.band}>
        <View>
          <Text style={s.bandTitle}>{doc.type === 'facture' ? 'FACTURE' : 'DEVIS'}</Text>
          <Text style={s.bandNum}>{doc.numero ? `#${doc.numero}` : `du ${formatDateFr(doc.issue_date)}`}</Text>
        </View>
        <Text style={s.bandCompany}>{settings.company_name}</Text>
      </View>
      <View style={s.body}>
        <View style={s.parties}>
          <View>
            <Text style={s.partyTitle}>Émetteur</Text>
            {settings.company_id ? <Text style={s.line}>{settings.company_id}</Text> : null}
            {settings.address ? <Text style={s.line}>{settings.address}</Text> : null}
            <Text style={s.line}>{[settings.postal_code, settings.city].filter(Boolean).join(' ')}</Text>
            {settings.country ? <Text style={s.line}>{settings.country}</Text> : null}
          </View>
          <View style={s.right}>
            <Text style={s.partyTitle}>Facturé à</Text>
            {clientName(doc) ? <Text style={s.strong}>{clientName(doc)}</Text> : null}
            {c.company_id ? <Text style={s.line}>{c.company_id}</Text> : null}
            {c.address ? <Text style={s.line}>{c.address}</Text> : null}
            <Text style={s.line}>{[c.postal_code, c.city, c.country].filter(Boolean).join(' ')}</Text>
            <Text style={s.line}>Émise le {formatDateFr(doc.issue_date)}</Text>
            <Text style={s.line}>Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ? formatDateFr(doc.due_date) : '—')}</Text>
          </View>
        </View>
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={s.cDesc}>Description</Text><Text style={s.cQty}>Qté</Text>
            <Text style={s.cPU}>Prix unitaire</Text><Text style={s.cTva}>TVA (%)</Text><Text style={s.cTotal}>Total HT</Text>
          </View>
          {lines.map((l) => (
            <View key={l.id} style={s.tRow}>
              <Text style={s.cDesc}>{l.label}</Text><Text style={s.cQty}>{String(l.quantity)}</Text>
              <Text style={s.cPU}>{formatCents(l.unit_price_cents, doc.currency)}</Text>
              <Text style={s.cTva}>{String(vatRate(doc))}</Text><Text style={s.cTotal}>{lineTotal(doc, l)}</Text>
            </View>
          ))}
        </View>
        <View style={s.totals}>
          <View style={s.totalRow}><Text>Total HT</Text><Text>{formatCents(totals.totalHTCents, doc.currency)}</Text></View>
          <View style={s.totalRow}><Text>TVA ({vatRate(doc)}%)</Text><Text>{formatCents(totals.totalTVACents, doc.currency)}</Text></View>
          <View style={s.grandRow}><Text style={s.grand}>Total TTC</Text><Text style={s.grand}>{formatCents(totals.totalTTCCents, doc.currency)}</Text></View>
        </View>
        <View style={s.mentions}>
          {paymentLines(doc, settings).map((line) => <Text key={line} style={s.mention}>Règlement — {line}</Text>)}
          {conditionLines(doc, settings).map((line) => <Text key={line} style={s.mention}>{line}</Text>)}
        </View>
      </View>
      {doc.footer || settings.footer_default ? <Text style={s.footerCenter}>{doc.footer || settings.footer_default}</Text> : null}
    </Page>
  );
}

/* ================================================================== */
/* BANDE LATÉRALE : colonne de couleur à gauche                        */
/* ================================================================== */

function LayoutLaterale({ doc, lines, settings, t, totals }: LayoutProps) {
  const c = doc.client_snapshot;
  const s = StyleSheet.create({
    page: { padding: 0, flexDirection: 'row', fontSize: 10, fontFamily: 'Helvetica', backgroundColor: t.colors.page, color: t.colors.ink },
    side: { width: '34%', backgroundColor: t.colors.accent, color: t.colors.bandText, paddingVertical: 44, paddingHorizontal: 22 },
    sideTitle: { fontSize: 17, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    sideNum: { marginTop: 3, marginBottom: 32, fontSize: 10 },
    sideLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5, marginTop: 22 },
    sideName: { fontFamily: 'Helvetica-Bold', marginBottom: 3, fontSize: 11 },
    sideLine: { marginBottom: 2, fontSize: 9 },
    main: { width: '66%', paddingVertical: 44, paddingHorizontal: 30 },
    partyTitle: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.5, color: t.colors.accent, marginBottom: 5, fontFamily: 'Helvetica-Bold' },
    strong: { fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    line: { marginBottom: 2, color: t.colors.muted },
    dates: { marginTop: 16, color: t.colors.muted },
    table: { marginTop: 26 },
    thead: { flexDirection: 'row', borderBottomWidth: 1.5, borderColor: t.colors.accent, paddingBottom: 6, fontSize: 8.5, color: t.colors.accent, fontFamily: 'Helvetica-Bold' },
    tRow: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 0.5, borderColor: '#DDDDDD' },
    cDesc: { width: '50%' }, cQty: { width: '12%', textAlign: 'center' }, cPU: { width: '18%', textAlign: 'right' }, cTotal: { width: '20%', textAlign: 'right' },
    totals: { marginTop: 16, alignSelf: 'flex-end', width: 190 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, color: t.colors.muted },
    grandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: t.colors.accent, paddingTop: 7, marginTop: 3 },
    grand: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: t.colors.ink },
    conditions: { marginTop: 26, color: t.colors.muted },
    conditionLine: { marginBottom: 2 },
  });

  return (
    <Page size="A4" style={s.page}>
      <View style={s.side}>
        <Text style={s.sideTitle}>{doc.type === 'facture' ? 'FACTURE' : 'DEVIS'}</Text>
        <Text style={s.sideNum}>{doc.numero ? `#${doc.numero}` : `du ${formatDateFr(doc.issue_date)}`}</Text>
        <Text style={s.sideLabel}>Émetteur</Text>
        <Text style={s.sideName}>{settings.company_name}</Text>
        {settings.company_id ? <Text style={s.sideLine}>{settings.company_id}</Text> : null}
        {settings.address ? <Text style={s.sideLine}>{settings.address}</Text> : null}
        <Text style={s.sideLine}>{[settings.postal_code, settings.city].filter(Boolean).join(' ')}</Text>
        {settings.country ? <Text style={s.sideLine}>{settings.country}</Text> : null}
        {paymentLines(doc, settings).length > 0 ? (
          <>
            <Text style={s.sideLabel}>Paiement</Text>
            {paymentLines(doc, settings).map((line) => <Text key={line} style={s.sideLine}>{line}</Text>)}
          </>
        ) : null}
      </View>
      <View style={s.main}>
        <Text style={s.partyTitle}>Facturé à</Text>
        {clientName(doc) ? <Text style={s.strong}>{clientName(doc)}</Text> : null}
        {c.company_id ? <Text style={s.line}>{c.company_id}</Text> : null}
        {c.address ? <Text style={s.line}>{c.address}</Text> : null}
        <Text style={s.line}>{[c.postal_code, c.city, c.country].filter(Boolean).join(' ')}</Text>
        <Text style={s.dates}>Émise le {formatDateFr(doc.issue_date)} — Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ? formatDateFr(doc.due_date) : '—')}</Text>
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={s.cDesc}>Description</Text><Text style={s.cQty}>Qté</Text>
            <Text style={s.cPU}>PU HT</Text><Text style={s.cTotal}>Total HT</Text>
          </View>
          {lines.map((l) => (
            <View key={l.id} style={s.tRow}>
              <Text style={s.cDesc}>{l.label}</Text><Text style={s.cQty}>{String(l.quantity)}</Text>
              <Text style={s.cPU}>{formatCents(l.unit_price_cents, doc.currency)}</Text><Text style={s.cTotal}>{lineTotal(doc, l)}</Text>
            </View>
          ))}
        </View>
        <View style={s.totals}>
          <View style={s.totalRow}><Text>Total HT</Text><Text>{formatCents(totals.totalHTCents, doc.currency)}</Text></View>
          <View style={s.totalRow}><Text>TVA ({vatRate(doc)}%)</Text><Text>{formatCents(totals.totalTVACents, doc.currency)}</Text></View>
          <View style={s.grandRow}><Text style={s.grand}>Total TTC</Text><Text style={s.grand}>{formatCents(totals.totalTTCCents, doc.currency)}</Text></View>
        </View>
        <View style={s.conditions}>
          {conditionLines(doc, settings).map((line) => <Text key={line} style={s.conditionLine}>{line}</Text>)}
          {doc.footer || settings.footer_default ? <Text style={s.conditionLine}>{doc.footer || settings.footer_default}</Text> : null}
        </View>
      </View>
    </Page>
  );
}

/* ================================================================== */
/* ÉLÉGANT : typographie serif, très aéré                              */
/* ================================================================== */

function LayoutElegant({ doc, lines, settings, t, totals }: LayoutProps) {
  const c = doc.client_snapshot;
  const s = StyleSheet.create({
    page: { paddingVertical: 64, paddingHorizontal: 72, fontSize: 10, fontFamily: 'Times-Roman', backgroundColor: t.colors.page, color: t.colors.ink },
    wordmark: { textAlign: 'center', fontSize: 20, fontFamily: 'Times-Bold', letterSpacing: 2 },
    tagline: { textAlign: 'center', marginTop: 4, color: t.colors.muted, fontSize: 9 },
    ruleTop: { borderBottomWidth: 1, borderColor: t.colors.accent, marginTop: 16 },
    ruleBottom: { borderBottomWidth: 1, borderColor: t.colors.accent, marginTop: 2, marginBottom: 26 },
    head: { flexDirection: 'row', justifyContent: 'space-between' },
    docLabel: { fontSize: 15, fontFamily: 'Times-Bold' },
    docNum: { marginTop: 2, color: t.colors.muted },
    right: { textAlign: 'right', color: t.colors.muted },
    partyTitle: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 2, color: t.colors.muted, marginBottom: 5, marginTop: 22, fontFamily: 'Times-Bold' },
    strong: { fontFamily: 'Times-Bold', marginBottom: 3 },
    line: { marginBottom: 2, color: t.colors.muted },
    thead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: t.colors.accent, paddingBottom: 6, marginTop: 30, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.2, color: t.colors.muted },
    tRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#D8D4CC' },
    cDesc: { width: '46%' }, cQty: { width: '10%', textAlign: 'center' }, cPU: { width: '18%', textAlign: 'right' },
    cTva: { width: '8%', textAlign: 'center' }, cTotal: { width: '18%', textAlign: 'right' },
    totals: { marginTop: 18, alignSelf: 'flex-end', width: 210 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, color: t.colors.muted },
    grandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: t.colors.accent, paddingTop: 7, marginTop: 3 },
    grand: { fontFamily: 'Times-Bold', fontSize: 12, color: t.colors.ink },
    bottom: { position: 'absolute', bottom: 52, left: 72, right: 72, textAlign: 'center', color: t.colors.muted, fontSize: 9, fontFamily: 'Times-Italic' },
    bottomLine: { marginBottom: 3 },
  });

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.wordmark}>{settings.company_name}</Text>
      {settings.address || settings.city ? (
        <Text style={s.tagline}>{[settings.address, settings.postal_code, settings.city, settings.country].filter(Boolean).join(' · ')}</Text>
      ) : null}
      <View style={s.ruleTop} />
      <View style={s.ruleBottom} />
      <View style={s.head}>
        <View>
          <Text style={s.docLabel}>{doc.type === 'facture' ? 'Facture' : 'Devis'}</Text>
          <Text style={s.docNum}>{doc.numero ? `Nº ${doc.numero}` : `du ${formatDateFr(doc.issue_date)}`}</Text>
        </View>
        <View style={s.right}>
          <Text>Émise le {formatDateFr(doc.issue_date)}</Text>
          <Text>Échéance : {doc.due_on_receipt ? 'à réception' : (doc.due_date ? formatDateFr(doc.due_date) : '—')}</Text>
          {settings.company_id ? <Text>{settings.company_id}</Text> : null}
        </View>
      </View>
      <Text style={s.partyTitle}>Facturé à</Text>
      {clientName(doc) ? <Text style={s.strong}>{clientName(doc)}</Text> : null}
      {c.company_id ? <Text style={s.line}>{c.company_id}</Text> : null}
      {c.address ? <Text style={s.line}>{c.address}</Text> : null}
      <Text style={s.line}>{[c.postal_code, c.city, c.country].filter(Boolean).join(' · ')}</Text>
      <View style={s.thead}>
        <Text style={s.cDesc}>Description</Text><Text style={s.cQty}>Qté</Text>
        <Text style={s.cPU}>Prix unitaire</Text><Text style={s.cTva}>TVA</Text><Text style={s.cTotal}>Total HT</Text>
      </View>
      {lines.map((l) => (
        <View key={l.id} style={s.tRow}>
          <Text style={s.cDesc}>{l.label}</Text><Text style={s.cQty}>{String(l.quantity)}</Text>
          <Text style={s.cPU}>{formatCents(l.unit_price_cents, doc.currency)}</Text>
          <Text style={s.cTva}>{String(vatRate(doc))}%</Text><Text style={s.cTotal}>{lineTotal(doc, l)}</Text>
        </View>
      ))}
      <View style={s.totals}>
        <View style={s.totalRow}><Text>Total HT</Text><Text>{formatCents(totals.totalHTCents, doc.currency)}</Text></View>
        <View style={s.totalRow}><Text>TVA ({vatRate(doc)}%)</Text><Text>{formatCents(totals.totalTVACents, doc.currency)}</Text></View>
        <View style={s.grandRow}><Text style={s.grand}>Total TTC</Text><Text style={s.grand}>{formatCents(totals.totalTTCCents, doc.currency)}</Text></View>
      </View>
      <View style={s.bottom}>
        {paymentLines(doc, settings).length > 0 ? <Text style={s.bottomLine}>{paymentLines(doc, settings).join(' — ')}</Text> : null}
        <Text style={s.bottomLine}>{conditionLines(doc, settings).join(' — ')}</Text>
        {doc.footer || settings.footer_default ? <Text style={s.bottomLine}>{doc.footer || settings.footer_default}</Text> : null}
      </View>
    </Page>
  );
}

/* ================================================================== */

export function DocumentPdf({ doc, lines, settings }: {
  doc: DocumentRow; lines: DocumentLineRow[]; settings: SettingsRow;
}) {
  const t = getTemplate(doc.template);
  const totals = computeTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPriceCents: l.unit_price_cents })),
    doc.vat_na ? 0 : Number(doc.vat_rate));
  const props = { doc, lines, settings, t, totals };

  return (
    <Document>
      {t.layout === 'minimal' ? <LayoutMinimal {...props} />
        : t.layout === 'bandeau' ? <LayoutBandeau {...props} />
        : t.layout === 'laterale' ? <LayoutLaterale {...props} />
        : t.layout === 'elegant' ? <LayoutElegant {...props} />
        : <LayoutModerne {...props} />}
    </Document>
  );
}
