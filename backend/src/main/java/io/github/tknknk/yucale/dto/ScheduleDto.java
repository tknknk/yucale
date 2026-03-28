package io.github.tknknk.yucale.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import io.github.tknknk.yucale.validation.ValidDateTimeRange;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ValidDateTimeRange(message = "End date/time must be after or equal to start date/time")
public class ScheduleDto {

    private Long id;

    private String urlId;

    @NotBlank(message = "Summary is required")
    @Size(min = 1, max = 255, message = "Summary must be between 1 and 255 characters")
    private String summary;

    @NotNull(message = "Start date/time is required")
    private LocalDateTime dtstart;

    @NotNull(message = "End date/time is required")
    private LocalDateTime dtend;

    private Boolean allDay;

    @Size(max = 255, message = "Location must not exceed 255 characters")
    private String location;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    private String song;

    private String recording;

    private String attendees;

    private LocalDateTime dtstamp;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String updatedBy;
}
