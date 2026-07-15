import React from "react";
import { Text, View } from "react-native";
import ServiceSelection from "../book-visit/ServiceSelection";
import SpecialtySelection from "../book-visit/SpecialtySelection";
import ProviderSelection from "../book-visit/ProviderSelection";
import DateTimeSelection from "../book-visit/DateTimeSelection";
import BookingSummary from "../book-visit/BookingSummary";
import { BOOK_VISIT_STEPS } from "../../../stores/bookVisitStore";
import { BOOK_VISIT_SCREEN_COPY } from "./bookVisit.content";

function StepSkeleton({ theme, metrics }) {
  return (
    <View style={{ gap: metrics.spacing.lg }}>
      <View
        style={{
          width: 220,
          height: 30,
          borderRadius: 15,
          backgroundColor: theme.skeletonBase,
        }}
      />
      <View
        style={{
          width: "100%",
          height: 320,
          borderRadius: metrics.radii.xl,
          backgroundColor: theme.skeletonSoft,
        }}
      />
    </View>
  );
}

export default function BookVisitStepPanel({
  theme,
  metrics,
  model,
  compact = false,
  loading = false,
}) {
  if (loading) {
    return <StepSkeleton theme={theme} metrics={metrics} />;
  }

  const showHeader = compact;

  return (
    <View style={{ gap: metrics.spacing.lg, flex: 1, minHeight: 0 }}>
      {!compact ? (
        <View style={{ gap: metrics.spacing.xs }}>
          <Text
            style={{
              color: theme.text,
              fontSize: Math.max(metrics.typography.title.fontSize + 4, 24),
              lineHeight: Math.max(metrics.typography.title.lineHeight + 6, 30),
              fontWeight: "700",
              letterSpacing: 0,
            }}
          >
            {BOOK_VISIT_SCREEN_COPY.center.title}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          borderRadius: metrics.radii.xl,
          backgroundColor: theme.card,
          overflow: "hidden",
          flex: 1,
          minHeight: 0,
        }}
      >
        {model.step === BOOK_VISIT_STEPS.SERVICE ? (
          <ServiceSelection
            onSelect={model.handleSelectService}
            showHeader={showHeader}
            enabled={model.scheduledVisitsEnabled}
          />
        ) : null}

        {model.step === BOOK_VISIT_STEPS.SPECIALTY ? (
          <SpecialtySelection
            specialties={model.filteredSpecialties}
            onSelect={model.handleSelectSpecialty}
            onSearchPress={model.openSpecialtySearch}
            showHeader={showHeader}
            loading={model.isSpecialtiesLoading}
            error={model.specialtiesError}
            onRetry={model.retrySpecialties}
          />
        ) : null}

        {model.step === BOOK_VISIT_STEPS.PROVIDER ? (
          <ProviderSelection
            providers={model.availableProviders}
            specialty={model.bookingData.specialty}
            onSelect={model.handleProviderSelect}
            showHeader={showHeader}
            searchQuery={model.facilitySearchQuery}
            onSearchChange={model.setFacilitySearchQuery}
            resultCount={model.facilityResultCount}
            loading={model.isFacilitiesLoading}
            refreshing={model.isFacilitiesRefreshing}
            error={model.facilitiesError}
            onRetry={model.retryFacilities}
            hasMore={model.hasMoreFacilities}
            loadingMore={model.isLoadingMoreFacilities}
            onLoadMore={model.loadMoreFacilities}
          />
        ) : null}

        {model.step === BOOK_VISIT_STEPS.DATETIME ? (
          <DateTimeSelection
            availabilityDays={model.availabilityDays}
            selectedDayKey={model.selectedAvailabilityDayKey}
            selectedSlot={model.bookingData.slot}
            onSelectDate={model.handleSelectDate}
            onSelectTime={model.handleSelectTime}
            onConfirm={model.handleConfirmDateTime}
            showHeader={showHeader}
            loading={model.isAvailabilityLoading}
            refreshing={model.isAvailabilityRefreshing}
            error={model.availabilityError}
            timezoneReady={model.facilityTimezoneReady}
            onRetry={model.retryAvailability}
            onChangeDates={model.handleChangeDates}
            onChangeFacility={model.handleChangeFacility}
            onChangeSpecialty={model.handleChangeSpecialty}
            recoveryNotice={model.availabilityRecoveryNotice}
          />
        ) : null}

        {model.step === BOOK_VISIT_STEPS.SUMMARY ? (
          <BookingSummary
            bookingData={model.bookingData}
            isSubmitting={model.isSubmitting}
            onConfirm={model.handleBookVisit}
            onNotesChange={model.handleNotesChange}
            showHeader={showHeader}
            error={model.error}
          />
        ) : null}
      </View>
    </View>
  );
}
