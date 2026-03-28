package io.github.tknknk.yucale.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyResponseDto {

    private Long id;
    private Long surveyDetailId;
    private String userName;
    private String belonging;
    private String responseOption;
    private String freeText;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
