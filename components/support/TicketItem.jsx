import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { COLORS } from "../../constants/colors";
import { styles } from "./HelpSupportScreen.styles";

export default function TicketItem({ ticket, isExpanded, onToggle, colors, isDarkMode }) {
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'open': return COLORS.brandPrimary;
            case 'resolved': return '#10B981'; // green
            case 'closed': return '#64748B'; // slate
            default: return '#F59E0B'; // amber
        }
    };

    return (
        <Pressable
            onPress={() => onToggle(ticket.id)}
            style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
        >
            <View
                style={[
                    styles.ticketCard,
                    {
                        backgroundColor: colors.card,
                        shadowOpacity: isDarkMode ? 0.2 : 0.04,
                    },
                ]}
            >
                <View style={styles.ticketHeader}>
                    <View 
                        style={[
                            styles.ticketStatusBadge,
                            { backgroundColor: getStatusColor(ticket.status) + '15' }
                        ]}
                    >
                        <Text style={[styles.ticketStatusText, { color: getStatusColor(ticket.status) }]}>
                            {ticket.status?.toUpperCase() || 'OPEN'}
                        </Text>
                    </View>
                    <Text style={[styles.ticketDate, { color: colors.textMuted }]}>
                        {ticket.created_at ? format(new Date(ticket.created_at), 'MMM d') : 'Now'}
                    </Text>
                </View>
                
                <Text style={[styles.ticketSubject, { color: colors.text }]}>
                    {ticket.subject}
                </Text>
                
                <Text 
                    numberOfLines={isExpanded ? undefined : 2} 
                    style={[styles.ticketMessage, { color: colors.textMuted }]}
                >
                    {ticket.message}
                </Text>

                {isExpanded && ticket.admin_response && (
                    <View style={[styles.responseContainer, { borderTopColor: colors.highlight }]}>
                        <View style={styles.responseHeader}>
                            <Ionicons name="return-down-forward" size={16} color={COLORS.brandPrimary} />
                            <Text style={styles.responseLabel}>
                                RESPONSE
                            </Text>
                        </View>
                        <Text style={[styles.responseText, { color: colors.text }]}>
                            {ticket.admin_response}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}
