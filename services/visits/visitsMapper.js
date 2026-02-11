import { normalizeVisit } from "../../utils/domainNormalize";

export const TABLE = "visits";

export const isMissingColumnError = (err, column) => {
    if (!err) return false;
    if (err.code !== "PGRST204") return false;
    const message = typeof err.message === "string" ? err.message : "";
    const details = typeof err.details === "string" ? err.details : "";
    return message.includes(column) || details.includes(column);
};

export const stripExtendedEmergencyColumns = (dbItem) => {
    if (!dbItem || typeof dbItem !== "object") return dbItem;
    const next = { ...dbItem };
    delete next.lifecycle_state;
    delete next.lifecycle_updated_at;
    delete next.rating;
    delete next.rating_comment;
    delete next.rated_at;
    return next;
};

export const shouldDisableExtendedColumns = (err) => {
    return (
        isMissingColumnError(err, "lifecycle_state") ||
        isMissingColumnError(err, "lifecycle_updated_at") ||
        isMissingColumnError(err, "rating") ||
        isMissingColumnError(err, "rating_comment") ||
        isMissingColumnError(err, "rated_at")
    );
};

export const mapToDb = (item) => {
    const db = { ...item };
    if (item.hospitalId !== undefined) db.hospital_id = item.hospitalId;
    if (item.roomNumber !== undefined) db.room_number = item.roomNumber;
    if (item.estimatedDuration !== undefined) db.estimated_duration = item.estimatedDuration;
    if (item.requestId !== undefined) db.request_id = item.requestId;
    if (item.doctorImage !== undefined) db.doctor_image = item.doctorImage;
    if (item.insuranceCovered !== undefined) db.insurance_covered = item.insuranceCovered;
    if (item.nextVisit !== undefined) db.next_visit = item.nextVisit;
    if (item.meetingLink !== undefined) db.meeting_link = item.meetingLink;
    if (item.lifecycleState !== undefined) db.lifecycle_state = item.lifecycleState;
    if (item.lifecycleUpdatedAt !== undefined) db.lifecycle_updated_at = item.lifecycleUpdatedAt;
    if (item.rating !== undefined) db.rating = item.rating;
    if (item.ratingComment !== undefined) db.rating_comment = item.ratingComment;
    if (item.ratedAt !== undefined) db.rated_at = item.ratedAt;

    // Remove camelCase keys
    delete db.hospitalId;
    delete db.roomNumber;
    delete db.estimatedDuration;
    delete db.requestId;
    delete db.createdAt;
    delete db.updatedAt;
    delete db.doctorImage;
    delete db.insuranceCovered;
    delete db.nextVisit;
    delete db.visitId;
    delete db.meetingLink;
    delete db.lifecycleState;
    delete db.lifecycleUpdatedAt;
    delete db.rating;
    delete db.ratingComment;
    delete db.ratedAt;

    return db;
};

export const mapFromDb = (row) => ({
    ...row,
    hospitalId: row.hospital_id,
    roomNumber: row.room_number,
    estimatedDuration: row.estimated_duration,
    requestId: row.request_id,
    doctorImage: row.doctor_image,
    insuranceCovered: row.insurance_covered,
    nextVisit: row.next_visit,
    meetingLink: row.meeting_link,
    lifecycleState: row.lifecycle_state,
    lifecycleUpdatedAt: row.lifecycle_updated_at,
    rating: row.rating,
    ratingComment: row.rating_comment,
    ratedAt: row.rated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export const fromDbRow = (row) => {
    return normalizeVisit(mapFromDb(row));
};
