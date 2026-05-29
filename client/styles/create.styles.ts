import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header Top
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButtonTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonTextTop: {
    fontSize: 28,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: -10,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  
  // Progress Bar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    width: 32,
    height: 10,
    borderRadius: 5,
  },
  progressDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  progressLine: {
    width: 30,
    height: 2,
    marginHorizontal: 4,
  },

  // Step Container
  stepContainer: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },

  // Section Title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginTop: 8,
  },

  // Destinations Grid
  destinationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  destinationCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  destinationCountry: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
  },
  destinationCity: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  destinationPrice: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Quick Dates
  quickDatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickDateCard: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickDateIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickDateTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickDateSubtitle: {
    fontSize: 12,
  },

  // Label
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Tip Box
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // Travelers
  travelersCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  travelersCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },
  travelersCount: {
    fontSize: 48,
    fontWeight: 'bold',
    marginHorizontal: 24,
  },
  travelersLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  travelersDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  travelerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  travelerDotText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  friendsListCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  friendsLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  friendsEmptyText: {
    padding: 20,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  friendCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendCheckboxMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },

  // Budget
  budgetCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  budgetValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  budgetRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeText: {
    fontSize: 12,
  },
  budgetPerPerson: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  sliderContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  sliderTrack: {
    width: 300,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#6366f1',
    borderRadius: 3,
    left: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: -9,
    backgroundColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  budgetPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  budgetPreset: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  budgetPresetIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  budgetPresetTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  budgetPresetSubtitle: {
    fontSize: 12,
  },

  // Interests
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    width: '48%',
    justifyContent: 'center',
  },
  interestChipIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Transport
  transportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transportCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  transportIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  transportLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    color: '#6366f1',
    fontWeight: 'bold',
  },

  // Quick Plan
  quickPlanBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    marginBottom: 20,
  },
  quickPlanIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  quickPlanContent: {
    flex: 1,
  },
  quickPlanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickPlanText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Navigation
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  nextButtonContainer: {
    flex: 1,
  },
  generateButtonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },

  // Error
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
    marginTop: 8,
    marginBottom: 16,
    color: '#ef4444',
  },
  fixedButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
    zIndex: 1000,
    elevation: 1000,
  },
  errorContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1001,
    elevation: 1001,
    },
  errorContainerText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#ef4444',
    textAlign: 'center',
 },
});