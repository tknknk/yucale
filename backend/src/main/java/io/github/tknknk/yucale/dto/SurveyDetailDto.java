package io.github.tknknk.yucale.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyDetailDto {

    private Long id;
    private Long scheduleId;
    private String scheduleSummary;
    private LocalDateTime scheduleDtstart;
    private LocalDateTime scheduleDtend;
    private Boolean mandatory;
    private List<SurveyResponseDto> responses;
}
