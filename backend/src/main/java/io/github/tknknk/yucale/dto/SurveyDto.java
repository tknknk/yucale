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
public class SurveyDto {

    private Long id;
    private String urlId;
    private String title;
    private String description;
    private List<String> belongingList;
    private List<ResponseOptionDto> responseOptions;
    private Boolean enableFreetext;
    private LocalDateTime deadlineAt;
    private Boolean softDue;
    private String createdByUsername;
    private List<SurveyDetailDto> details;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean hasResponded;
}
