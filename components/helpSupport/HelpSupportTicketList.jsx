import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";

function TicketStatusPill({ status, theme }) {
  const normalized = String(status || "open").toLowerCase();
  const isOpen = normalized === "open" || normalized === "pending";
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: isOpen
          ? theme.pillActive
          : theme.cardMuted,
      }}
    >
      <Text
        style={{
          color: isOpen ? COLORS.brandPrimary : theme.textMuted,
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
        }}
      >
        {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
      </Text>
    </View>
  );
}

function SectionHeading({ label, theme }) {
  return (
    <Text
      style={{
        color: theme.textMuted,
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  );
}

function TicketRow({
  ticket,
  expanded,
  highlighted = false,
  onPress,
  formatTicketDate,
  theme,
  metrics,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: metrics.radii.lg,
        padding: metrics.spacing.md,
        gap: metrics.spacing.sm,
        backgroundColor: highlighted ? theme.pillActive : theme.cardMuted,
        borderWidth: highlighted ? 1 : 0,
        borderColor: highlighted ? COLORS.brandPrimary : "transparent",
        opacity: pressed ? 0.94 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: metrics.spacing.sm,
        }}
      >
        <TicketStatusPill status={ticket?.status} theme={theme} />
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 12,
            fontWeight: "400",
          }}
        >
          {formatTicketDate(ticket?.updatedAt || ticket?.createdAt)}
        </Text>
      </View>

      <Text
        style={{
          color: theme.text,
          fontSize: 17,
          lineHeight: 23,
          fontWeight: "600",
          letterSpacing: -0.2,
        }}
      >
        {ticket?.subject || "Support request"}
      </Text>

      <Text
        numberOfLines={expanded ? undefined : 2}
        style={{
          color: theme.textMuted,
          fontSize: 14,
          lineHeight: 21,
          fontWeight: "400",
        }}
      >
        {ticket?.message}
      </Text>

      {expanded ? (
        <View
          style={{
            gap: metrics.spacing.xs,
            paddingTop: metrics.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <Text
            style={{
              color: ticket?.adminResponse ? COLORS.brandPrimary : theme.textMuted,
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 0.15,
            }}
          >
            {ticket?.adminResponse
              ? HELP_SUPPORT_SCREEN_COPY.rows.response
              : HELP_SUPPORT_SCREEN_COPY.rows.awaitingReply}
          </Text>
          <Text
            style={{
              color: ticket?.adminResponse ? theme.text : theme.textMuted,
              fontSize: 14,
              lineHeight: 21,
              fontWeight: "400",
            }}
          >
            {ticket?.adminResponse ||
              "We’ll reply here as soon as a support specialist picks this up."}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function TicketsSkeleton({ theme, metrics }) {
  const rows = [0, 1];
  return (
    <View style={{ gap: metrics.spacing.md }}>
      {rows.map((row) => (
        <View
          key={row}
          style={{
            borderRadius: metrics.radii.lg,
            padding: metrics.spacing.md,
            gap: metrics.spacing.sm,
            backgroundColor: theme.cardMuted,
          }}
        >
          <View
            style={{
              width: 84,
              height: 24,
              borderRadius: 999,
              backgroundColor: theme.skeletonSoft,
            }}
          />
          <View
            style={{
              width: row === 0 ? "58%" : "46%",
              height: 18,
              borderRadius: 999,
              backgroundColor: theme.skeletonBase,
            }}
          />
          <View style={{ gap: 8 }}>
            <View
              style={{
                width: "94%",
                height: 14,
                borderRadius: 999,
                backgroundColor: theme.skeletonSoft,
              }}
            />
            <View
              style={{
                width: "72%",
                height: 14,
                borderRadius: 999,
                backgroundColor: theme.skeletonSoft,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HelpSupportTicketList({
  sections,
  loading = false,
  theme,
  metrics,
  expandedTicketIds,
  highlightedTicketId,
  formatTicketDate,
  onToggleTicket,
  onOpenComposer,
}) {
  if (loading) {
    return <TicketsSkeleton theme={theme} metrics={metrics} />;
  }

  if (!sections.length) {
    return (
      <View style={{ gap: metrics.spacing.md }}>
        <View
          style={{
            borderRadius: metrics.radii.lg,
            padding: metrics.spacing.lg,
            gap: metrics.spacing.sm,
            backgroundColor: theme.cardMuted,
            alignItems: "flex-start",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: theme.pillActive,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={22}
              color={COLORS.brandPrimary}
            />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 17,
              lineHeight: 22,
              fontWeight: "600",
              letterSpacing: -0.2,
            }}
          >
            {HELP_SUPPORT_SCREEN_COPY.center.emptyTitle}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 14,
              lineHeight: 21,
              fontWeight: "400",
            }}
          >
            {HELP_SUPPORT_SCREEN_COPY.center.emptyBody}
          </Text>
          <Pressable
            onPress={onOpenComposer}
            style={({ pressed }) => ({
              minHeight: 46,
              paddingHorizontal: 18,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.brandPrimary,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                lineHeight: 20,
                fontWeight: "700",
                letterSpacing: -0.2,
              }}
            >
              {HELP_SUPPORT_SCREEN_COPY.center.newRequest}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: metrics.spacing.lg }}>
      {sections.map((section) => (
        <View key={section.key} style={{ gap: metrics.spacing.sm }}>
          <SectionHeading label={section.label} theme={theme} />
          <View style={{ gap: metrics.spacing.sm }}>
            {section.items.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                expanded={expandedTicketIds.has(ticket.id)}
                highlighted={String(highlightedTicketId || "") === String(ticket.id)}
                onPress={() => onToggleTicket(ticket.id)}
                formatTicketDate={formatTicketDate}
                theme={theme}
                metrics={metrics}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
