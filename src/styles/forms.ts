import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const forms = StyleSheet.create({
  // ── Labels ────────────────────────────────────────────────────────────────
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  subLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, opacity: 0.7 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline' },
  hint: { fontSize: 13, lineHeight: 18, opacity: 0.7 },
  fieldError: { fontSize: 12, color: '#C05050' },
  inputError: { fontSize: 12, color: '#C05050' },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Segmented control ─────────────────────────────────────────────────────
  segmentRow: { flexDirection: 'row' },
  segDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  segLeft: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopLeftRadius: Spacing.two,
    borderBottomLeftRadius: Spacing.two,
  },
  segMid: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two },
  segRight: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopRightRadius: Spacing.two,
    borderBottomRightRadius: Spacing.two,
  },

  // ── Toggle switch ─────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // ── Dropdowns ─────────────────────────────────────────────────────────────
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  dropdownTriggerActive: { opacity: 0.75 },
  chevron: { fontSize: 18, lineHeight: 22 },
  dropdown: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: Spacing.two,
    gap: Spacing.two,
  },
  dropdownList: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.one },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  dropdownEmpty: { textAlign: 'center', opacity: 0.6, paddingVertical: Spacing.one },

  // ── Name + icon row ───────────────────────────────────────────────────────
  nameRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.two },
  iconBtn: {
    borderRadius: Spacing.two,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Rounds picker ─────────────────────────────────────────────────────────
  roundsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  roundsInput: {
    borderRadius: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minWidth: 52,
    alignItems: 'center',
  },

  // ── Player chips ──────────────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Spacing.one,
  },
  dropdownBtns: { flexDirection: 'row', gap: Spacing.two },

  // ── Scroll containers ─────────────────────────────────────────────────────
  formScroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.two },

  // ── Action buttons ────────────────────────────────────────────────────────
  createBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
});
