export var NotificationType;
(function (NotificationType) {
    NotificationType["NEW_REQUESTS_THRESHOLD_MET"] = "new_requests_threshold_met";
    NotificationType["NOTE_PUBLISHED_ON_REQUEST"] = "note_published_on_request";
    NotificationType["NOTE_RECEIVED_RATINGS"] = "note_received_ratings";
    NotificationType["NOTE_STATUS_CHANGED"] = "note_status_changed";
    NotificationType["CONTRIBUTOR_MILESTONE_REACHED"] = "contributor_milestone_reached";
})(NotificationType || (NotificationType = {}));
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority[NotificationPriority["LOW"] = 1] = "LOW";
    NotificationPriority[NotificationPriority["MEDIUM"] = 2] = "MEDIUM";
    NotificationPriority[NotificationPriority["HIGH"] = 3] = "HIGH";
    NotificationPriority[NotificationPriority["URGENT"] = 4] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
export var NotificationMethod;
(function (NotificationMethod) {
    NotificationMethod["DISCORD_DM"] = "discord_dm";
    NotificationMethod["CHANNEL_MENTION"] = "channel_mention";
})(NotificationMethod || (NotificationMethod = {}));
//# sourceMappingURL=types.js.map