package io.github.tknknk.yucale.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.github.tknknk.yucale.entity.Schedule;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class IcsService {

    private final ScheduleService scheduleService;

    @Value("${ics.output.path:./calendar.ics}")
    private String icsOutputPath;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private static final DateTimeFormatter ICS_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");
    private static final DateTimeFormatter ICS_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String CRLF = "\r\n";

    /**
     * Generate ICS calendar content from all schedules
     */
    public String generateIcsContent() {
        StringBuilder ics = new StringBuilder();

        // Calendar header
        ics.append("BEGIN:VCALENDAR").append(CRLF);
        ics.append("VERSION:2.0").append(CRLF);
        ics.append("PRODID:-//Yucale//EN").append(CRLF);
        ics.append("CALSCALE:GREGORIAN").append(CRLF);
        ics.append("METHOD:PUBLISH").append(CRLF);
        ics.append("X-WR-CALNAME:Yucale").append(CRLF);

        // Add all events
        List<Schedule> schedules = scheduleService.getAllSchedulesForIcs();
        for (Schedule schedule : schedules) {
            appendEvent(ics, schedule);
        }

        // Calendar footer
        ics.append("END:VCALENDAR").append(CRLF);

        return ics.toString();
    }

    /**
     * Generate and save ICS file to the configured path
     */
    public void generateAndSaveIcsFile() {
        try {
            String icsContent = generateIcsContent();
            Path path = Paths.get(icsOutputPath);

            // Create parent directories if they don't exist
            if (path.getParent() != null) {
                Files.createDirectories(path.getParent());
            }

            Files.writeString(path, icsContent, StandardCharsets.UTF_8);
            log.info("ICS file generated successfully at: {}", path.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to generate ICS file: {}", e.getMessage(), e);
        }
    }

    /**
     * Append a single event to the ICS content
     */
    private void appendEvent(StringBuilder ics, Schedule schedule) {
        ics.append("BEGIN:VEVENT").append(CRLF);

        // UID - unique identifier for the event
        ics.append("UID:schedule-").append(schedule.getId()).append("@Yucale").append(CRLF);

        // DTSTAMP - timestamp when the event was created/modified
        ics.append("DTSTAMP:").append(formatDateTimeUtc(schedule.getDtstamp())).append(CRLF);

        // DTSTART and DTEND
        if (Boolean.TRUE.equals(schedule.getAllDay())) {
            // All-day event - use DATE format
            ics.append("DTSTART;VALUE=DATE:").append(formatDate(schedule.getDtstart())).append(CRLF);
            ics.append("DTEND;VALUE=DATE:").append(formatDate(schedule.getDtend().plusDays(1))).append(CRLF);
        } else {
            // Timed event - use DATETIME format
            ics.append("DTSTART:").append(formatDateTimeUtc(schedule.getDtstart())).append(CRLF);
            ics.append("DTEND:").append(formatDateTimeUtc(schedule.getDtend())).append(CRLF);
        }

        // SUMMARY (required)
        ics.append("SUMMARY:").append(escapeIcsText(schedule.getSummary())).append(CRLF);

        // DESCRIPTION - formatted with song, description, recording, and URL
        String description = buildDescription(schedule);
        if (!description.isEmpty()) {
            ics.append("DESCRIPTION:").append(escapeIcsText(description)).append(CRLF);
        }

        // LOCATION (optional)
        if (schedule.getLocation() != null && !schedule.getLocation().isEmpty()) {
            ics.append("LOCATION:").append(escapeIcsText(schedule.getLocation())).append(CRLF);
        }

        // CREATED and LAST-MODIFIED
        if (schedule.getCreatedAt() != null) {
            ics.append("CREATED:").append(formatDateTimeUtc(schedule.getCreatedAt())).append(CRLF);
        }
        if (schedule.getUpdatedAt() != null) {
            ics.append("LAST-MODIFIED:").append(formatDateTimeUtc(schedule.getUpdatedAt())).append(CRLF);
        }

        ics.append("END:VEVENT").append(CRLF);
    }

    /**
     * Format LocalDateTime to ICS datetime format (UTC)
     */
    public String formatDateTimeUtc(LocalDateTime dateTime) {
        if (dateTime == null) {
            return formatDateTimeUtc(LocalDateTime.now());
        }
        // Convert to UTC
        ZonedDateTime zonedDateTime = dateTime.atZone(ZoneId.systemDefault())
                .withZoneSameInstant(ZoneId.of("UTC"));
        return zonedDateTime.format(ICS_DATETIME_FORMATTER);
    }

    /**
     * Format LocalDateTime to ICS date format (for all-day events)
     */
    public String formatDate(LocalDateTime dateTime) {
        if (dateTime == null) {
            return formatDate(LocalDateTime.now());
        }
        return dateTime.format(ICS_DATE_FORMATTER);
    }

    /**
     * Build DESCRIPTION content with song, description, recording, and URL
     */
    private String buildDescription(Schedule schedule) {
        StringBuilder desc = new StringBuilder();

        // Song
        if (schedule.getSong() != null && !schedule.getSong().isEmpty()) {
            desc.append("🎵 ").append(schedule.getSong());
        }

        // Description
        if (schedule.getDescription() != null && !schedule.getDescription().isEmpty()) {
            if (desc.length() > 0) {
                desc.append("\n\n");
            }
            desc.append("📝 ").append(schedule.getDescription());
        }

        // Recording
        if (schedule.getRecording() != null && !schedule.getRecording().isEmpty()) {
            if (desc.length() > 0) {
                desc.append("\n\n");
            }
            desc.append("🔊 ").append(schedule.getRecording());
        }

        // URL (always add if urlId exists)
        if (schedule.getUrlId() != null && !schedule.getUrlId().isEmpty()) {
            if (desc.length() > 0) {
                desc.append("\n\n");
            }
            desc.append("📅 ").append(frontendUrl).append("/schedule/").append(schedule.getUrlId());
        }

        return desc.toString();
    }

    /**
     * Escape special characters for ICS format
     * According to RFC 5545, the following characters need escaping:
     * - Backslash (\) -> \\
     * - Semicolon (;) -> \;
     * - Comma (,) -> \,
     * - Newline -> \n
     */
    public String escapeIcsText(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\r\n", "\\n")
                .replace("\n", "\\n")
                .replace("\r", "\\n");
    }
}
