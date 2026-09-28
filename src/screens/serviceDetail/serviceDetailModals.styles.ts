import { StyleSheet } from 'react-native';

import { radius, spacing, type ThemeColors } from '../../theme';

// Shared by the satisfaction, delivery-signature and full-screen-signature
// modals used from ServiceDetailScreen. Some generic dialog primitives here
// intentionally duplicate a couple of entries also kept in
// ServiceDetailScreen's own stylesheet, since those are still used by the
// origin/destination/phones/feedback modals that were not extracted.
export function createServiceDetailModalStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    borderRadius: radius.md,
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
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dialogConfirmButtonWide: {
    flex: 1.6,
  },
  dialogSingleActionButton: {
    alignSelf: 'stretch',
    flex: 0,
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
    color: '#2a250f',
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
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 280,
    overflow: 'hidden',
  },

    // ─── Full-screen signature modal ───────────────────────────
  fullSignatureScreen: {
    backgroundColor: colors.surfaceSoft,
    flex: 1,
  },
  fullSignatureHeader: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  fullSignatureHeaderTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  fullSignatureHeaderBtn: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.blue,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  fullSignatureHeaderBtnText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  fullSignatureCanvasWrap: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flex: 1,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  fullSignatureCanvasInner: {
    flex: 1,
    overflow: 'hidden',
  },
  fullSignatureFooter: {
    backgroundColor: colors.surfaceSoft,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  fullSignatureUseBtn: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 14,
    paddingVertical: spacing.md,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  fullSignatureUseBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Pista visual opcional dentro del canvas
  fullSignatureHintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingBottom: spacing.sm,
  },
  fullSignatureHintText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  });
}

export const signatureWebStyle = `
  * {
    box-sizing: border-box;
  }
  body, html {
    background: transparent;
    border: none;
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: 0;
    width: 100%;
  }
  .m-signature-pad {
    border: none;
    box-shadow: none;
    height: 100%;
    margin: 0;
    width: 100%;
  }
  .m-signature-pad--body {
    border: none;
    height: 100%;
    margin: 0;
    width: 100%;
  }
  .m-signature-pad--body canvas {
    background: transparent;
    border: none;
    display: block;
    height: 100% !important;
    width: 100% !important;
  }
  .m-signature-pad--footer {
    display: none;
    margin: 0;
  }
`;export const signatureWebStyleFull = `
  * {
    box-sizing: border-box;
  }
  body, html {
    background: #ffffff;
    border: none;
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: 0;
    width: 100%;
  }
  .m-signature-pad {
    border: none;
    box-shadow: none;
    height: 100%;
    margin: 0;
    width: 100%;
  }
  .m-signature-pad--body {
    background: #ffffff;
    border: none;
    height: 100%;
    margin: 0;
    width: 100%;
  }
  .m-signature-pad--body canvas {
    background: #ffffff;
    border: none;
    display: block;
    height: 100% !important;
    width: 100% !important;
  }
  .m-signature-pad--footer {
    display: none;
    margin: 0;
  }
`;