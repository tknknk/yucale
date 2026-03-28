package io.github.tknknk.yucale.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.tknknk.yucale.service.IcsService;

@RestController
@RequiredArgsConstructor
public class IcsController {

    private final IcsService icsService;

    /**
     * GET /calendar.ics - Returns ICS file content
     * This endpoint is public and can be subscribed to by calendar applications
     */
    @GetMapping("/calendar.ics")
    public ResponseEntity<String> getCalendarIcs() {
        String icsContent = icsService.generateIcsContent();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar; charset=utf-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"calendar.ics\"");
        headers.setCacheControl("no-cache, no-store, must-revalidate");
        headers.setPragma("no-cache");
        headers.setExpires(0);

        return ResponseEntity.ok()
                .headers(headers)
                .body(icsContent);
    }
}
