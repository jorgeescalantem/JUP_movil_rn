import { StyleSheet } from 'react-native';

import { spacing } from '../../theme';

// Shared by the satisfaction, delivery-signature and full-screen-signature
// modals used from ServiceDetailScreen. Some generic dialog primitives here
// intentionally duplicate a couple of entries also kept in
// ServiceDetailScreen's own stylesheet, since those are still used by the
// origin/destination/phones/feedback modals that were not extracted.
export const serviceDetailModalStyles = StyleSheet.create({
  dialogOverlay: {
    alignItems: 'center',
    backgroundColor: '#00000066',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialogCardLarge: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e1e8',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '100%',
  },
  dialogTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  dialogSubtitle: {
    color: '#4b5563',
    fontSize: 13,
    lineHeight: 20,
  },
  deliveryNoticeText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    textDecorationColor: '#93c5fd',
    textDecorationLine: 'underline',
  },
  dialogInput: {
    backgroundColor: '#f7fafc',
    borderColor: '#c8d6e5',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dialogError: {
    color: '#ba1a1a',
    fontSize: 12,
    fontWeight: '700',
  },
  dialogInputLabelHint: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '700',
  },
  satisfactionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  satisfactionGauge: {
    borderRadius: 22,
    overflow: 'hidden',
    width: 44,
  },
  satisfactionSegment: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  satisfactionSegmentActive: {
    borderColor: '#0f172a',
    borderWidth: 2,
  },
  satisfactionLabelWrap: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  satisfactionEmoji: {
    fontSize: 40,
  },
  satisfactionLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  satisfactionPlaceholder: {
    color: '#7b8791',
    fontSize: 13,
  },
  satisfactionCommentInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  satisfactionCounter: {
    color: '#7b8791',
    fontSize: 11,
    textAlign: 'right',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dialogButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dialogConfirmButtonWide: {
    flex: 1.6,
  },
  dialogCancelButton: {
    backgroundColor: '#eff3f7',
  },
  dialogConfirmButton: {
    backgroundColor: '#ff6424',
  },
  dialogCancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  dialogConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  signatureHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    rowGap: spacing.xs,
  },
  signatureHeaderActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  signatureLabel: {
    color: '#0f172a',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  signatureExpandButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  signatureExpandText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  signatureClearButton: {
    backgroundColor: '#eff3f7',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  signatureClearText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  signaturePad: {
    backgroundColor: '#f8fafc',
    borderColor: '#c8d6e5',
    borderRadius: 12,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
  },
  fullSignatureScreen: {
    backgroundColor: '#eef2f5',
    flex: 1,
  },
  fullSignatureHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  fullSignatureHeaderTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  fullSignatureHeaderBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe4ec',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  fullSignatureHeaderBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  fullSignatureCanvasWrap: {
    borderTopColor: '#d2d9df',
    borderTopWidth: 1,
    flex: 1,
    marginTop: spacing.xs,
  },
  fullSignatureFooter: {
    backgroundColor: '#eef2f5',
    padding: spacing.lg,
  },
  fullSignatureUseBtn: {
    alignItems: 'center',
    backgroundColor: '#ff6424',
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  fullSignatureUseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

export const signatureWebStyle = `
  .m-signature-pad {
    box-shadow: none;
    border: none;
    height: 100%;
    margin: 0;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
    margin: 0;
  }
  body, html {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
`;
