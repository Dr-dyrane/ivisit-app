import React from "react";
import { Pressable, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import HelpSupportAskIVisit from "./HelpSupportAskIVisit";
import HelpSupportFaqList from "./HelpSupportFaqList";
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";
import HelpSupportTicketList from "./HelpSupportTicketList";

function SectionShell({
  title,
  actionLabel,
  onAction,
  theme,
  metrics,
  children,
}) {
  return (
    <View
      style={{
        borderRadius: metrics.radii.xl,
        padding: metrics.spacing.lg,
        gap: metrics.spacing.md,
        backgroundColor: theme.card,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: metrics.spacing.md,
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: 18,
            lineHeight: 24,
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => ({
              opacity: pressed ? 0.84 : 1,
            })}
          >
            <Text
              style={{
                color: COLORS.brandPrimary,
                fontSize: 14,
                lineHeight: 18,
                fontWeight: "600",
              }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ErrorBanner({ message, onRetry, theme, metrics }) {
  return (
    <View
      style={{
        borderRadius: metrics.radii.lg,
        padding: metrics.spacing.md,
        gap: metrics.spacing.sm,
        backgroundColor: theme.pillActive,
      }}
    >
      <Text
        style={{
          color: theme.text,
          fontSize: 14,
          lineHeight: 20,
          fontWeight: "500",
        }}
      >
        {message || HELP_SUPPORT_SCREEN_COPY.messages.syncFailed}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          opacity: pressed ? 0.84 : 1,
        })}
      >
        <Text
          style={{
            color: COLORS.brandPrimary,
            fontSize: 14,
            lineHeight: 18,
            fontWeight: "600",
          }}
        >
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

export default function HelpSupportMainContent({
  model,
  theme,
  metrics,
  contentPaddingHorizontal = 0,
}) {
  return (
    <View
      style={{
        gap: metrics.spacing.lg,
        paddingHorizontal: contentPaddingHorizontal,
      }}
    >
      <HelpSupportAskIVisit
        query={model.askQuery}
        proposal={model.askProposal}
        feedback={model.askFeedback}
        onQueryChange={model.onAskQueryChange}
        onSubmit={model.onAskSubmit}
        onFeedback={model.onAskFeedback}
        onEscalate={model.onEscalateAsk}
        theme={theme}
        metrics={metrics}
      />

      <SectionShell
        title={HELP_SUPPORT_SCREEN_COPY.center.title}
        theme={theme}
        metrics={metrics}
      >
        {model.error ? (
          <ErrorBanner
            message={model.error}
            onRetry={() => {
              void model.onRetry();
            }}
            theme={theme}
            metrics={metrics}
          />
        ) : null}

        <HelpSupportTicketList
          sections={model.ticketSections}
          loading={model.loading}
          theme={theme}
          metrics={metrics}
          expandedTicketIds={model.expandedTicketIds}
          highlightedTicketId={model.highlightedTicketId}
          formatTicketDate={model.formatTicketDate}
          onToggleTicket={model.onToggleTicket}
          onOpenComposer={model.onOpenComposer}
          composerActionPrimary={false}
        />
      </SectionShell>

      <SectionShell
        title={HELP_SUPPORT_SCREEN_COPY.center.faqTitle}
        theme={theme}
        metrics={metrics}
      >
        <HelpSupportFaqList
          faqs={model.faqs}
          loading={model.loading && !model.hasFaqs}
          theme={theme}
          metrics={metrics}
          expandedFaqIds={model.expandedFaqIds}
          onToggleFaq={model.onToggleFaq}
        />
      </SectionShell>
    </View>
  );
}
